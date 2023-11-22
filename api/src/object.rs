/*
 * object.rs
 *
 * attribution-metadata
 * Copyright (C) 2023-2023 SCP-EN Technical Team
 *
 * attribution-metadata is available free of charge under the terms of the MIT
 * License. You are free to redistribute and/or modify it under those
 * terms. It is distributed in the hopes that it will be useful, but
 * WITHOUT ANY WARRANTY. See the LICENSE file for more details.
 *
 */

use crate::utils::replace_in_place;
use aws_sdk_dynamodb::types::AttributeValue;
use once_cell::sync::Lazy;
use regex::Regex;
use std::num::NonZeroU32;

/// Verifies that a string is a date in ISO-8601 format.
static DATE_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$").unwrap());

/// Yields whitespace at the beginning or end of a string.
static WHITESPACE_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?:^\s+|\s+$)").unwrap());

#[derive(Serialize, Deserialize, Debug, Copy, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AttributionType {
    Author,
    Rewrite,
    Translator,
    Maintainer,
}

impl AttributionType {
    pub fn field_name(self) -> &'static str {
        match self {
            AttributionType::Author => "author",
            AttributionType::Rewrite => "rewrite",
            AttributionType::Translator => "translator",
            AttributionType::Maintainer => "maintainer",
        }
    }
}

impl TryFrom<&'_ str> for AttributionType {
    type Error = AttributionTypeConversionError;

    fn try_from(value: &str) -> Result<AttributionType, Self::Error> {
        match value {
            "author" => Ok(AttributionType::Author),
            "rewrite" => Ok(AttributionType::Rewrite),
            "translator" => Ok(AttributionType::Translator),
            "maintainer" => Ok(AttributionType::Maintainer),
            _ => Err(AttributionTypeConversionError),
        }
    }
}

#[derive(Debug)]
pub struct AttributionTypeConversionError;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AttributionEntry {
    #[serde(rename = "type")]
    pub attribution_type: AttributionType,
    pub user_name: String,
    pub user_id: Option<NonZeroU32>,
    pub date: Option<String>,
}

impl TryFrom<AttributionEntry> for AttributeValue {
    type Error = String;

    fn try_from(
        AttributionEntry {
            attribution_type,
            mut user_name,
            user_id,
            date,
        }: AttributionEntry,
    ) -> Result<AttributeValue, String> {
        let attribution_type = attribution_type.field_name();
        debug!(attribution_type, user_name, user_id, date);

        // Trim whitespace off of username
        //
        // It can only be a mistake, and instead of
        // returning an error we can just fix it ourselves.
        replace_in_place(&mut user_name, &WHITESPACE_REGEX, "");

        // Check that username isn't an empty string
        if user_name.is_empty() {
            error!("Passed username was empty");
            return Err(str!(
                "Username cannot be an empty string or only whitespace",
            ));
        }

        // Check date against pattern
        if let Some(ref date) = date {
            if !DATE_REGEX.is_match(date) {
                error!("Date value was invalid");
                return Err(format!(
                    "Date value '{date}' is invalid (must be YYYY-MM-DD)",
                ));
            }
        }

        // Build final map
        Ok(AttributeValue::M(hashmap! {
            str!("type") => AttributeValue::S(str!(attribution_type)),
            str!("user_name") => AttributeValue::S(user_name),
            str!("user_id") => match user_id {
                Some(num) => AttributeValue::N(str!(num)),
                None => AttributeValue::Null(true),
            },
            str!("date") => match date {
                Some(date) => AttributeValue::S(date),
                None => AttributeValue::Null(true),
            },
        }))
    }
}

impl From<&'_ AttributeValue> for AttributionEntry {
    fn from(value: &AttributeValue) -> AttributionEntry {
        debug!("Converting DynamoDB object to attribution entry");

        // Very ugly. If there is a serde solution for AttributeValue -> object,
        //            please replace this with that instead.

        let map = value
            .as_m()
            .expect("Top-level item for attribution not map");

        let attribution_type_raw: &str =
            map["type"].as_s().expect("Field 'type' not string");

        let attribution_type = attribution_type_raw
            .try_into()
            .expect("Field 'type' not valid AttributionType enum value");

        let user_name = map["user_name"]
            .as_s()
            .expect("Field 'user_name' not string")
            .to_string();

        let user_id = match &map["user_id"] {
            AttributeValue::Null(true) => None,
            AttributeValue::N(value) => {
                let user_id = value
                    .parse()
                    .expect("Field 'user_id' not valid integer value");
                Some(user_id)
            }
            _ => panic!("Field 'user_id' not number or null'"),
        };

        let date = match &map["date"] {
            AttributeValue::Null(true) => None,
            AttributeValue::S(value) => Some(str!(value)),
            _ => panic!("Field 'date' not number or string"),
        };

        AttributionEntry {
            attribution_type,
            user_name,
            user_id,
            date,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Attribution(pub Vec<AttributionEntry>);

impl Attribution {
    /// Sorts all the attribution metadata entries based on date.
    pub fn sort(&mut self) {
        debug!("Sorting attribution entries by date");

        self.0.sort_by_key(|entry| match &entry.date {
            Some(date) => date.clone(),
            None => String::new(), // We want all null entries to be first
        });
    }
}

impl TryFrom<Attribution> for AttributeValue {
    type Error = String;

    fn try_from(attribution: Attribution) -> Result<AttributeValue, String> {
        info!("Converting attribution list to DynamoDB object");

        let mut values = Vec::new();
        for entry in attribution.0 {
            let value = entry.try_into()?;
            values.push(value);
        }

        Ok(AttributeValue::L(values))
    }
}

impl From<&'_ AttributeValue> for Attribution {
    fn from(value: &AttributeValue) -> Attribution {
        info!("Converting DynamoDB object to attribution list");

        let mut entries = Vec::new();
        let list = value
            .as_l()
            .expect("Top-level item for attribution not list");
        for value in list {
            entries.push(value.into());
        }

        Attribution(entries)
    }
}

/// A complete attribution object (within a site).
///
/// This is similar to the data row stored within DynamoDB, except
/// lacking the site data because it would be the same when fetching
/// a full suite of attributions for a site.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FullAttribution {
    pub page_slug: String,
    pub attribution: Attribution,
}
