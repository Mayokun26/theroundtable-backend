# TheRoundTable - Verify API Key Script
# This script verifies the OpenAI API key is correctly set up

$ErrorActionPreference = "Continue"

Write-Host "🔍 TheRoundTable OpenAI API Key Verification" -ForegroundColor Cyan

# Check for .env file in backend
$envFile = Join-Path (Get-Location) "theroundtable-backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

# Read .env file
$envContent = Get-Content $envFile
$openaiApiKey = $null

# Extract OpenAI API key
foreach ($line in $envContent) {
    if ($line -match "^OPENAI_API_KEY=(.+)$") {
        $openaiApiKey = $matches[1].Trim()
        break
    }
}

if (-not $openaiApiKey) {
    Write-Host "❌ OPENAI_API_KEY not found in .env file" -ForegroundColor Red
    exit 1
}

# Check key format
if ($openaiApiKey -notmatch "^sk-") {
    Write-Host "❌ Invalid API key format (should start with 'sk-')" -ForegroundColor Red
    Write-Host "   Found: $($openaiApiKey.Substring(0, 5))..." -ForegroundColor Red
    exit 1
}

# Display key information
Write-Host "✅ OpenAI API key found:" -ForegroundColor Green
Write-Host "   • Starts with: $($openaiApiKey.Substring(0, 6))..." -ForegroundColor Green
Write-Host "   • Length: $($openaiApiKey.Length) characters" -ForegroundColor Green

# Run verification using the backend script
Write-Host "`n🔍 Testing API key with actual OpenAI API call..." -ForegroundColor Cyan

# Change to backend directory
Set-Location "theroundtable-backend"

# Run verification script
$output = npm run verify-openai 2>&1

# Check result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ OpenAI API key verification passed!" -ForegroundColor Green
    Write-Host "   The API key is valid and working correctly." -ForegroundColor Green
} else {
    Write-Host "`n❌ OpenAI API key verification failed!" -ForegroundColor Red
    Write-Host "   Please update your API key in the .env file." -ForegroundColor Red
    
    # Show output for debugging
    Write-Host "`nError details:" -ForegroundColor Yellow
    $output
    exit 1
}

# Return to original directory
Set-Location ".."
