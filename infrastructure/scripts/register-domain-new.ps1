#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

# Parameters for domain registration
$domainName = "theroundtableai.com"

# Read and parse contact information
$contactData = Get-Content -Raw -Path "..\contact.json" | ConvertFrom-Json

# Create contact hashtable with exact required format
$contact = @{
    FirstName = $contactData.FirstName
    LastName = $contactData.LastName
    ContactType = "PERSON"
    OrganizationName = " "
    AddressLine1 = $contactData.AddressLine1
    City = $contactData.City
    State = $contactData.State
    CountryCode = $contactData.CountryCode
    ZipCode = $contactData.ZipCode
    PhoneNumber = $contactData.PhoneNumber
    Email = $contactData.Email
}

# Convert to JSON and create parameter file for AWS CLI
$contactJson = $contact | ConvertTo-Json -Compress
Set-Content -Path "contact-params.json" -Value $contactJson

# Escape quotes in JSON for command line
$escapedJSON = $contactJSON.Replace('"', '\"')

# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-1"

# First check if domain is available
Write-Host "Checking domain availability..."
$availability = aws route53domains check-domain-availability --domain-name $domainName --query 'Availability' --output text
if ($availability -ne "AVAILABLE") {
    Write-Error "Domain $domainName is not available for registration"
    exit 1
}

# Register domain using file-based parameters
Write-Host "Registering domain $domainName..."
$registerCmd = "aws route53domains register-domain" + `
    " --domain-name `"$domainName`"" + `
    " --duration-in-years 1" + `
    " --auto-renew" + `
    " --admin-contact file://contact-params.json" + `
    " --registrant-contact file://contact-params.json" + `
    " --tech-contact file://contact-params.json" + `
    " --privacy-protect-admin" + `
    " --privacy-protect-registrant" + `
    " --privacy-protect-tech"

Write-Host "Executing registration command..."
Invoke-Expression $registerCmd

Write-Host "Domain registration initiated. Checking status..."

# Check registration status
$maxAttempts = 10
$attempts = 0
do {
    $attempts++
    try {
        $status = aws route53domains get-domain-detail --domain-name $domainName --query 'Status' --output text
        Write-Host "Current status: $status"
        if ($status -ne "PENDING") {
            break
        }
    }
    catch {
        Write-Host "Waiting for domain registration to process..."
    }
    Start-Sleep -Seconds 30
} while ($attempts -lt $maxAttempts)

if ($status -eq "SUCCESS") {
    Write-Host "Domain registration successful!"
} else {
    Write-Error "Domain registration failed or timed out. Last status: $status"
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
