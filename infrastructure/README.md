# Domain Setup Guide

## Prerequisites
Before running the Terraform configuration, you need to set up your domain contact information. This is required for domain registration but is kept secure and separate from version control.

1. Set the following environment variables:
```powershell
$env:DOMAIN_CONTACT_FIRST_NAME = "Your First Name"
$env:DOMAIN_CONTACT_LAST_NAME = "Your Last Name"
$env:DOMAIN_CONTACT_ADDRESS = "Your Address"
$env:DOMAIN_CONTACT_CITY = "Your City"
$env:DOMAIN_CONTACT_STATE = "Your State"
$env:DOMAIN_CONTACT_COUNTRY_CODE = "US"
$env:DOMAIN_CONTACT_ZIP = "Your ZIP"
$env:DOMAIN_CONTACT_PHONE = "Your Phone (+1.1234567890 format)"
$env:DOMAIN_CONTACT_EMAIL = "your.email@example.com"
```

2. Run the contact info setup script:
```powershell
./scripts/load-contact-info.ps1
```

3. Deploy the infrastructure:
```powershell
cd terraform
terraform init
terraform apply
```

## Security Notes
- Contact information is stored in `contact.json` which is git-ignored
- Sensitive variables are marked as sensitive in Terraform
- Use AWS Secrets Manager for production credentials
- Environment variables should be set in a secure manner (not in version control)

## Infrastructure Components
- Route53 for DNS management
- ACM for SSL certificates
- CloudFront for content delivery
- S3 for static website hosting
- API Gateway for backend services
