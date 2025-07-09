# Parameters
$domain = "theroundtableai.com"
$operation = "register-domain"
$contactFile = "contact.json"

# First, let's check any existing operations
Write-Host "Checking existing operations..."
aws route53domains list-operations | Out-File -FilePath "operations.json"

# Function to create contact JSON in the exact format AWS expects
function Create-ContactJson {
    param (
        [string]$contactFile
    )
    
    $rawJson = Get-Content -Raw $contactFile | ConvertFrom-Json
    
    # Create the contact object with exact AWS expected format
    $contact = @{
        AddressLine1 = $rawJson.AddressLine1
        City = $rawJson.City
        ContactType = "PERSON"
        CountryCode = $rawJson.CountryCode
        Email = $rawJson.Email
        FirstName = $rawJson.FirstName
        LastName = $rawJson.LastName
        PhoneNumber = $rawJson.PhoneNumber
        State = $rawJson.State
        ZipCode = $rawJson.ZipCode
    }
    
    return $contact
}

# Create properly formatted contact JSON
$contact = Create-ContactJson -contactFile "..\contact.json"
$contactJson = $contact | ConvertTo-Json -Compress

# Save to temp file
$tempFile = "temp_contact.json"
$contactJson | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Testing domain availability..."
$available = aws route53domains check-domain-availability `
    --region us-east-1 `
    --domain-name $domain `
    --query "Availability" `
    --output text

if ($available -eq "AVAILABLE") {
    Write-Host "Domain is available. Proceeding with registration..."
    
    # Register using file input for contacts
    $cmd = "aws route53domains register-domain" + `
        " --domain-name $domain" + `
        " --duration-in-years 1" + `
        " --auto-renew" + `
        " --admin-contact fileb://$tempFile" + `
        " --registrant-contact fileb://$tempFile" + `
        " --tech-contact fileb://$tempFile" + `
        " --privacy-protect-admin" + `
        " --privacy-protect-registrant" + `
        " --privacy-protect-tech"
    
    Write-Host "Executing registration..."
    $result = Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Registration command executed successfully"
        Write-Host "Operation ID: $result"
    } else {
        Write-Error "Registration failed"
    }
} else {
    Write-Host "Domain appears unavailable, but this might be cached. Trying direct registration..."
    Write-Host "Availability status: $available"
}

# Cleanup
Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
