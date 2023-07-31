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

use crate::object::{Attribution, FullAttribution};
use aws_sdk_dynamodb::{types::AttributeValue, Client as DynamoClient};
use lambda_http::Error;

const TABLE: &str = "attribution_metadata";

#[derive(Deserialize, Debug)]
pub struct UpdatePageAttributionInput {
    #[serde(rename = "site")]
    pub site_slug: String,

    #[serde(rename = "page")]
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

pub async fn delete_page_attribution(
    dynamo: &DynamoClient,
    site_slug: String,
    page_slug: String,
) -> Result<(), Error> {
    dynamo
        .delete_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(site_slug))
        .key("page_slug", AttributeValue::S(page_slug))
        .send()
        .await?;

    Ok(())
}

pub async fn get_page_attribution(
    dynamo: &DynamoClient,
    site_slug: &str,
    page_slug: &str,
) -> Result<Option<Attribution>, Error> {
    let result = dynamo
        .get_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(str!(site_slug)))
        .key("page_slug", AttributeValue::S(str!(page_slug)))
        .projection_expression("attribution")
        .send()
        .await?;

    match result.item() {
        None => Ok(None),
        Some(item) => {
            let object = &item["attribution"];
            Ok(Some(object.into()))
        }
    }
}

pub async fn get_site_attribution(
    dynamo: &DynamoClient,
    site_slug: &str,
) -> Result<Vec<FullAttribution>, Error> {
    let mut attributions = Vec::new();
    let mut exclusive_start_key = None;

    // Maximum body size from DynamoDB is 1 MB, so we may need to fetch repeatedly
    loop {
        info!("Running full-site scan (start {exclusive_start_key:?})");

        let result = dynamo
            .scan()
            .table_name(TABLE)
            .limit(1000)
            .set_exclusive_start_key(exclusive_start_key)
            .filter_expression("site_slug = :site_slug")
            .expression_attribute_values(":site_slug", AttributeValue::S(str!(site_slug)))
            .send()
            .await?;

        match result.items {
            None => break,
            Some(items) => {
                for item in items {
                    // Extract page_slug
                    let page_slug = item["page_slug"]
                        .as_s()
                        .expect("Field 'page_slug' not string")
                        .clone();

                    // Convert each from DynamoDB to AttributionEntry
                    let attribution_raw = &item["attribution"];
                    let attribution = attribution_raw.into();

                    // Create and push FullAttribution object
                    attributions.push(FullAttribution {
                        page_slug,
                        attribution,
                    });
                }

                // Set flag for last item received to continue pagination
                match result.last_evaluated_key {
                    None => break,
                    Some(last_evaluated_key) => {
                        exclusive_start_key = Some(last_evaluated_key);
                    }
                }
            }
        }
    }

    Ok(attributions)
}
