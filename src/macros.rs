/*
 * macros.rs
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

macro_rules! parse_body {
    ($req:expr $(,)?) => {{
        let bytes = match $req.body() {
            Body::Empty => &[],
            Body::Text(string) => string.as_bytes(),
            Body::Binary(bytes) => bytes.as_slice(),
        };

        match serde_json::from_slice(bytes) {
            Ok(data) => data,
            Err(error) => {
                let message = input_error(&error)?;
                return Ok((400, message));
            }
        }
    }};
}

macro_rules! check_password {
    ($dynamo:expr, $site_slug:expr, $password:expr, $password_type:expr $(,)?) => {
        match check_password(&$dynamo, &$site_slug, &$password, $password_type).await {
            Ok(true) => (),
            Ok(false) => return Ok((403, invalid_password($password_type)?)),
            Err(error) => return Ok((500, service_error(&*error)?)),
        }
    };
}

macro_rules! json_output {
    ($future:expr) => {
        match $future.await {
            Ok(object) => Ok((200, serde_json::to_string(&object)?)),
            Err(error) => Ok((500, service_error(&*error)?)),
        }
    };
}

macro_rules! success {
    () => {
        Ok((200, success()?))
    };
}
