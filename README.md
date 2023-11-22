## attribution-metadata

A service which stores information regarding authorship (attribution) of SCP Wiki articles.

Because Wikidot does not recognize authorship beyond page creation, this has been a longstanding issue that SCP Wiki branches and sister sites have solved through the use of [attribution-metadata](https://scpwiki.com/attribution-metadata). This was previously a page on the Wikidot site which simply had a table with all the data on it, stored in wikitext. However, this means it is also subject to Wikidot page limitations, and when we passed that limit, it was clear that spending the time on a proper, better solution was the way to go.

This is that service. Defined in `api/`, this process stores all the attribution data in AWS DynamoDB, and handles requests without a permanent server using AWS Lambda.

There is a corresponding web frontend, located in `web/`, which provides a convenient way of interacting with this service. However, any REST client can communicate with this service, for instance as part of automated checks or updates.

### License

Available under the terms of the MIT License.
