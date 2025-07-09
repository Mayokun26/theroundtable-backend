# Load contact information from environment variables and create contact.json
$contactInfo = @{
    FirstName = $env:DOMAIN_CONTACT_FIRST_NAME
    LastName = $env:DOMAIN_CONTACT_LAST_NAME
    ContactType = "PERSON"
    OrganizationName = ""
    AddressLine1 = $env:DOMAIN_CONTACT_ADDRESS
    City = $env:DOMAIN_CONTACT_CITY
    State = $env:DOMAIN_CONTACT_STATE
    CountryCode = $env:DOMAIN_CONTACT_COUNTRY_CODE
    ZipCode = $env:DOMAIN_CONTACT_ZIP
    PhoneNumber = $env:DOMAIN_CONTACT_PHONE
    Email = $env:DOMAIN_CONTACT_EMAIL
}

# Convert to JSON and save
$contactInfo | ConvertTo-Json | Set-Content -Path "..\terraform\contact.json"
