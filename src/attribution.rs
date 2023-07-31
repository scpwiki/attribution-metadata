/*
 * attribution.rs
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
use aws_sdk_dynamodb::{
    types::{AttributeValue, Select},
    Client as DynamoClient,
};
use lambda_http::Error;
use once_cell::sync::Lazy;
use regex::Regex;
use std::convert::TryFrom;
use std::num::NonZeroU32;
use tokio_stream::StreamExt;

const TABLE: &str = "attribution_metadata";

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Attribution(pub Vec<AttributionEntry>);

impl TryFrom<Attribution> for AttributeValue {
    type Error = String;

    fn try_from(attribution: Attribution) -> Result<AttributeValue, String> {
        info!("Converting attribution entry to DynamoDB object");

        let mut values = Vec::new();
        for entry in attribution.0 {
            let value = entry.try_into()?;
            values.push(value);
        }

        Ok(AttributeValue::L(values))
    }
}

#[derive(Deserialize, Debug)]
pub struct UpdatePageAttributionInput {
    pub site_slug: String,
    pub page_slug: String,
    pub password: String,
    pub attributions: Attribution,
}

pub async fn update_page_attribution(
    dynamo: &DynamoClient,
    site_slug: String,
    page_slug: String,
    attributions: AttributeValue,
) -> Result<(), Error> {
    dynamo
        .update_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(site_slug))
        .key("page_slug", AttributeValue::S(page_slug))
        .update_expression("SET attribution = :attribution")
        .expression_attribute_values(":attribution", attributions)
        .send()
        .await?;

    Ok(())
}

pub async fn get_page_attribution(
    dynamo: &DynamoClient,
    site_slug: &str,
    page_slug: &str,
) -> Result<Attribution, Error> {
    let attribution = dynamo
        .get_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(str!(site_slug)))
        .key("page_slug", AttributeValue::S(str!(page_slug)))
        .projection_expression("attribution")
        .send()
        .await?;

    todo!()
}

pub async fn get_site_attribution(
    dynamo: &DynamoClient,
    site_slug: &str,
) -> Result<Vec<Attribution>, Error> {
    let result: Result<Vec<_>, _> = dynamo
        .scan()
        .table_name(TABLE)
        .select(Select::SpecificAttributes)
        .filter_expression("site_slug = :site_slug")
        .expression_attribute_values("site_slug", AttributeValue::S(str!(site_slug)))
        .into_paginator()
        .items()
        .send()
        .collect()
        .await;

    let attributions = result?;

    todo!()
}
