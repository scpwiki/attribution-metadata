/*
 * handlers.rs
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

use crate::attribution::{get_page_attribution, get_site_attribution};
use crate::password::{
    check_password, update_password, ChangePasswordInput, CheckPasswordInput,
    PasswordType,
};
use crate::result::ServiceResult;
use crate::utils::*;
use lambda_http::{Body, Error, Request, RequestExt};

macro_rules! input_error {
    ($message:expr) => {
        return Ok((400, input_error(&$message)?))
    };
}

pub async fn handle_get_page(req: Request) -> Result<(u16, String), Error> {
    info!("Received page attribution request");

    // We use URL parameters because this is a GET request.

    let params = match req.query_string_parameters_ref() {
        Some(params) => params,
        None => input_error!("missing URL parameters 'site' and 'page'"),
    };

    let site_slug = match params.first("site") {
        Some(slug) => slug,
        None => input_error!("missing URL parameter 'site'"),
    };

    let page_slug = match params.first("page") {
        Some(slug) => slug,
        None => input_error!("missing URL parameter 'page'"),
    };

    info!(site_slug, page_slug);

    todo!()
}

pub async fn handle_set_page(req: Request) -> Result<(u16, String), Error> {
    info!("Received page attribution update request");

    todo!()
}

pub async fn handle_get_site(req: Request) -> Result<(u16, String), Error> {
    info!("Received site attribution list request");

    let dynamo = connect_dynamo_db().await;
    let site_slug = match req
        .query_string_parameters_ref()
        .and_then(|params| params.first("site"))
    {
        // We only need one URL parameter here.
        Some(site_slug) => site_slug,
        None => input_error!("missing URL parameter 'site'"),
    };

    info!(site_slug);

    match get_site_attribution(&dynamo, site_slug).await {
        Ok(attributions) => Ok((200, serde_json::to_string(&attributions)?)),
        Err(error) => Ok((500, service_error(&*error)?)),
    }
}

pub async fn handle_password_check(req: Request) -> Result<(u16, String), Error> {
    info!("Received password check request");

    let dynamo = connect_dynamo_db().await;
    let CheckPasswordInput {
        site_slug,
        password,
        password_type,
    } = parse_body!(&req);

    info!(site_slug, password_type = password_type.field_name());
    check_password!(dynamo, site_slug, password, password_type);
    success!()
}

pub async fn handle_password_update(req: Request) -> Result<(u16, String), Error> {
    info!("Received password update request");

    let dynamo = connect_dynamo_db().await;
    let ChangePasswordInput {
        site_slug,
        password_type,
        old_password,
        new_password,
        admin_password,
    } = parse_body!(&req);

    info!(site_slug, password_type = password_type.field_name());
    check_password!(dynamo, site_slug, admin_password, PasswordType::Admin);
    check_password!(dynamo, site_slug, old_password, password_type);
    update_password(&dynamo, site_slug, new_password, password_type).await?;
    success!()
}

pub fn handle_info() -> Result<(u16, String), Error> {
    info!("Received info request");

    #[derive(Serialize, Debug)]
    struct BuildInfo {
        version_major: &'static str,
        version_minor: &'static str,
        version_patch: &'static str,
        target: &'static str,
        host: &'static str,
        profile: &'static str,
        family: &'static str,
        endian: &'static str,
        pointer_width: &'static str,
        rustc: &'static str,
        rustdoc: &'static str,
        opt_level: &'static str,
        num_jobs: u32,
        features: &'static [&'static str],
    }

    let body = ServiceResult::success(BuildInfo {
        version_major: crate::build::PKG_VERSION_MAJOR,
        version_minor: crate::build::PKG_VERSION_MINOR,
        version_patch: crate::build::PKG_VERSION_PATCH,
        target: crate::build::TARGET,
        host: crate::build::HOST,
        profile: crate::build::PROFILE,
        family: crate::build::CFG_FAMILY,
        endian: crate::build::CFG_ENDIAN,
        pointer_width: crate::build::CFG_POINTER_WIDTH,
        rustc: crate::build::RUSTC_VERSION,
        rustdoc: crate::build::RUSTDOC_VERSION,
        opt_level: crate::build::OPT_LEVEL,
        num_jobs: crate::build::NUM_JOBS,
        features: &crate::build::FEATURES,
    })
    .to_json()?;

    Ok((200, body))
}

pub fn handle_ping() -> Result<(u16, String), Error> {
    info!("Received ping request");
    let body = ServiceResult::success("pong").to_json()?;
    Ok((200, body))
}

pub fn handle_missing_route(path: &str) -> Result<(u16, String), Error> {
    info!("Received invalid request (no such route)");
    let body = ServiceResult::error(
        "invalid-route",
        format!("No handler exists for path '{path}'"),
    )
    .to_json()?;

    Ok((400, body))
}
