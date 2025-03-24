# xlsx-sanitiser tool

## Summary

An in browser Vue.Js Javascript file sanitiser intended for use with mailing lists.  

This tool processes your files entirely within your web browser, ensuring complete data privacy and security. When you
upload a file, all processing occurs locally on your computer - similar to opening a file in Excel. No data is ever
transmitted to external servers, stored in the cloud, or saved anywhere outside your browser. Once you close your
browser or navigate away from the page, all processed data is automatically cleared.

----

## Usage
upload a .xlsx file and receive a sanitised CSV along with a separate CSV any failed

Current Input/Output Format:

| Name | EmailAddress | Block_Number__c | Level__c | Unit_Number__c |
|------|---------|-------|-------|------|
| |

### Sanitisation behaviour

Name
* removes `,()` characters

Email Address
* standard valid email format
* Sanitisation:
  * forces emails to end in `.com`
    * i.e. example@test.comasd will be sanitised to example@test.com
  * any prepended `mailto:` links are removed

Block_Number__c
* checks for field to be `Alphanumeric`

Level__c
* checks for field to be `Numeric`

Unit_Number__c
* checks for field to be `Numeric`

## Expansion plans

* email pinger to check if it is a valid active email (50% done)
* simple form to define input/output mapping of header fields
