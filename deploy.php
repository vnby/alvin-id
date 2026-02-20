<?php
/**
 * GitHub Webhook Deploy Script
 * Triggered by GitHub on every push to the main branch.
 * Place this file in public_html/ and set up a GitHub webhook pointing here.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
define('WEBHOOK_SECRET', 'f42f192993ecfb711a29240a0f5775902d3c591e219059ff210ef34a2de4b1cc');
define('GITHUB_REPO',    'vnby/alvin-id');
define('DEPLOY_BRANCH',  'main');
define('DEPLOY_DIR',     __DIR__); // = public_html
// ─────────────────────────────────────────────────────────────────────────────

// 1. Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

// 2. Verify GitHub signature
$payload   = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$expected  = 'sha256=' . hash_hmac('sha256', $payload, WEBHOOK_SECRET);

if (!hash_equals($expected, $sigHeader)) {
    http_response_code(403);
    exit('Forbidden: invalid signature');
}

// 3. Only deploy on push to the target branch
$data = json_decode($payload, true);
if (($data['ref'] ?? '') !== 'refs/heads/' . DEPLOY_BRANCH) {
    http_response_code(200);
    exit('Skipped: not ' . DEPLOY_BRANCH);
}

// 4. Respond to GitHub immediately (avoids 10s webhook timeout)
//    Then continue deploying in the background.
$response = json_encode(['status' => 'accepted', 'branch' => DEPLOY_BRANCH]);
http_response_code(200);
header('Content-Type: application/json');
header('Content-Length: ' . strlen($response));
header('Connection: close');
echo $response;

if (ob_get_level() > 0) {
    ob_end_flush();
}
flush();

ignore_user_abort(true);
set_time_limit(120);

// 5. Download the branch ZIP from GitHub
$zipUrl     = "https://github.com/" . GITHUB_REPO . "/archive/refs/heads/" . DEPLOY_BRANCH . ".zip";
$tmpZipPath = tempnam(sys_get_temp_dir(), 'gh_deploy_') . '.zip';

$ch = curl_init($zipUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_TIMEOUT        => 90,
]);
$zipData  = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$zipData) {
    exit("Failed to download ZIP (HTTP $httpCode)");
}

file_put_contents($tmpZipPath, $zipData);

// 6. Extract ZIP to a temp directory
$tmpExtractDir = sys_get_temp_dir() . '/gh_deploy_' . uniqid();
mkdir($tmpExtractDir, 0755, true);

$zip = new ZipArchive();
if ($zip->open($tmpZipPath) !== true) {
    http_response_code(500);
    exit('Failed to open ZIP archive');
}
$zip->extractTo($tmpExtractDir);
$zip->close();
unlink($tmpZipPath);

// GitHub extracts into a subfolder named: {repo-name}-{branch}
$repoName      = explode('/', GITHUB_REPO)[1]; // "alvin-id"
$extractedPath = $tmpExtractDir . '/' . $repoName . '-' . DEPLOY_BRANCH;

if (!is_dir($extractedPath)) {
    // Fallback: grab the first directory found
    $found = glob($tmpExtractDir . '/*', GLOB_ONLYDIR);
    if (empty($found)) {
        http_response_code(500);
        exit('Could not locate extracted directory');
    }
    $extractedPath = $found[0];
}

// 6. Copy files to public_html (skip internal/sensitive items)
$skipList = ['.git', '.github', '.gitignore', '.DS_Store', 'deploy.php'];

function deployFiles(string $src, string $dst, array $skip): void
{
    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $skip, true)) continue;

        $srcPath = $src . DIRECTORY_SEPARATOR . $item;
        $dstPath = $dst . DIRECTORY_SEPARATOR . $item;

        if (is_dir($srcPath)) {
            if (!is_dir($dstPath)) {
                mkdir($dstPath, 0755, true);
            }
            deployFiles($srcPath, $dstPath, $skip);
        } else {
            copy($srcPath, $dstPath);
        }
    }
}

deployFiles($extractedPath, DEPLOY_DIR, $skipList);

// 7. Clean up temp directory
function removeDir(string $dir): void
{
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        is_dir($path) ? removeDir($path) : unlink($path);
    }
    rmdir($dir);
}

removeDir($tmpExtractDir);

// 8. Done
http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    'status'   => 'deployed',
    'branch'   => DEPLOY_BRANCH,
    'time'     => date('Y-m-d H:i:s T'),
]);
