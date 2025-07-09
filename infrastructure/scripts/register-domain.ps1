#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

# Parameters for domain registration
$domainName = "theroundtableai.com"
$contactJSON = Get-Content -Raw -Path "..\contact.json" | ConvertFrom-Json

# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-1"

# Create contact JSON
$contactInfo = @{
    FirstName = $contactJSON.FirstName
    LastName = $contactJSON.LastName
    ContactType = "PERSON"
    OrganizationName = ""
    AddressLine1 = $contactJSON.AddressLine1
    City = $contactJSON.City
    State = $contactJSON.State
    CountryCode = $contactJSON.CountryCode
    ZipCode = $contactJSON.ZipCode
    PhoneNumber = $contactJSON.PhoneNumber
    Email = $contactJSON.Email
} | ConvertTo-Json -Compress

# Register domain
Write-Host "Registering domain $domainName..."
$registerCmd = "aws route53domains register-domain" + `
    " --domain-name $domainName" + `
    " --duration-in-years 1" + `
    " --auto-renew" + `
    " --admin-contact '$contactInfo'" + `
    " --registrant-contact '$contactInfo'" + `
    " --tech-contact '$contactInfo'" + `
    " --privacy-protect-admin" + `
    " --privacy-protect-registrant" + `
    " --privacy-protect-tech"

Invoke-Expression $registerCmd

Write-Host "Domain registration initiated. Checking status..."

# Check registration status
do {
    $status = aws route53domains get-domain-detail --domain-name $domainName --query 'Status' --output text
    Write-Host "Current status: $status"
    Start-Sleep -Seconds 30
} while ($status -eq "PENDING")

if ($status -eq "SUCCESS") {
    Write-Host "Domain registration successful!"
} else {
    Write-Error "Domain registration failed with status: $status"
    exit 1
}

# Output next steps
Write-Host @"
Domain registration complete! Next steps:
1. Run 'terraform init' in the terraform directory
2. Run 'terraform plan' to verify infrastructure changes
3. Run 'terraform apply' to deploy the infrastructure
4. Verify DNS propagation (may take up to 48 hours)
"@
