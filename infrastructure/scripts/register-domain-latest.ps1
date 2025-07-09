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

# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-1"

# First check if domain is available
Write-Host "Checking domain availability..."
$availability = aws route53domains check-domain-availability --domain-name $domainName --query 'Availability' --output text
if ($availability -ne "AVAILABLE") {
    Write-Error "Domain $domainName is not available for registration"
    exit 1
}

# Register domain
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
    " --privacy-protect-tech" + `
    " --output text"

Write-Host "Executing registration command..."
$operationId = Invoke-Expression $registerCmd
Write-Host "Registration initiated with Operation ID: $operationId"

# Clean up parameter file
Remove-Item -Path "contact-params.json"

Write-Host "Checking operation status..."

# Check operation status first
$maxAttempts = 20  # Increased attempts for operation status
$attempts = 0
$opStatus = ""

do {
    $attempts++
    try {
        $opStatus = aws route53domains get-operation-detail --operation-id $operationId --query 'Status' --output text
        $opMessage = aws route53domains get-operation-detail --operation-id $operationId --query 'Message' --output text
        Write-Host "Operation status: $opStatus"
        Write-Host "Operation message: $opMessage"
        
        if ($opStatus -eq "SUCCESSFUL") {
            Write-Host "Registration operation completed successfully!"
            break
        }
        elseif ($opStatus -eq "FAILED") {
            Write-Error "Registration operation failed: $opMessage"
            exit 1
        }
        elseif ($opStatus -eq "ERROR") {
            Write-Error "Registration operation encountered an error: $opMessage"
            exit 1
        }
    }
    catch {
        Write-Host "Waiting for operation to complete..."
    }
    Start-Sleep -Seconds 30
} while ($attempts -lt $maxAttempts)

if ($opStatus -ne "SUCCESSFUL") {
    Write-Error "Operation timed out or failed to complete successfully"
    exit 1
}

# Now wait a bit before checking domain status
Write-Host "Operation successful. Waiting 60 seconds before verifying domain registration..."
Start-Sleep -Seconds 60

# Finally check domain status
$maxAttempts = 5
$attempts = 0
do {
    $attempts++
    try {
        $domainDetail = aws route53domains get-domain-detail --domain-name $domainName
        Write-Host "Domain registration verified!"
        break
    }
    catch {
        if ($attempts -lt $maxAttempts) {
            Write-Host "Waiting for domain to become active..."
            Start-Sleep -Seconds 30
        }
    }
} while ($attempts -lt $maxAttempts)

Write-Host @"
Domain registration process completed! Next steps:
1. Run 'terraform init' in the terraform directory
2. Run 'terraform plan' to verify infrastructure changes
3. Run 'terraform apply' to deploy the infrastructure
4. Verify DNS propagation (may take up to 48 hours)
"@
