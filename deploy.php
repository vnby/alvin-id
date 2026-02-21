<?php
/**
 * GitHub Webhook Deploy Script
 * Responds to GitHub immediately (within 10s timeout), deploys in background.
 * Logs every deploy to /home/wyihuuag/deploy.log
 * Sends an email alert on failure.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
define('WEBHOOK_SECRET', 'f42f192993ecfb711a29240a0f5775902d3c591e219059ff210ef34a2de4b1cc');
define('GITHUB_REPO',    'vnby/alvin-id');
define('DEPLOY_BRANCH',  'main');
define('DEPLOY_DIR',     __DIR__); // = public_html
define('ALERT_EMAIL',    'malvinabyan@gmail.com');
define('LOG_FILE',       '/home/wyihuuag/deploy.log');
// ─────────────────────────────────────────────────────────────────────────────

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function write_log(string $level, string $message): void
{
    $line = '[' . date('Y-m-d H:i:s T') . '] [' . $level . '] ' . $message . PHP_EOL;
    file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

function alert(string $subject, string $body): void
{
    $headers = implode("\r\n", [
        'From: deploy@alvin.id',
        'Content-Type: text/plain; charset=UTF-8',
    ]);
    mail(ALERT_EMAIL, '[alvin.id] ' . $subject, $body, $headers);
}

function fail(string $reason): void
{
    write_log('ERROR', $reason);
    alert('Deploy failed', $reason . "\n\nCheck the log: " . LOG_FILE);
    exit($reason);
}
// ─────────────────────────────────────────────────────────────────────────────

// 1. Only accept POST — redirect anything else back to the main site
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: https://alvin.id/', true, 301);
    exit();
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

// 5. Log deploy start
$commit  = $data['after'] ?? 'unknown';
$pusher  = $data['pusher']['name'] ?? 'unknown';
write_log('INFO', "Deploy started — commit: {$commit}, pusher: {$pusher}");

// 6. Download the branch ZIP from GitHub
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
    fail("Failed to download ZIP from GitHub (HTTP {$httpCode})");
}

file_put_contents($tmpZipPath, $zipData);

// 7. Extract ZIP to a temp directory
$tmpExtractDir = sys_get_temp_dir() . '/gh_deploy_' . uniqid();
mkdir($tmpExtractDir, 0755, true);

$zip = new ZipArchive();
if ($zip->open($tmpZipPath) !== true) {
    fail('Failed to open ZIP archive');
}
$zip->extractTo($tmpExtractDir);
$zip->close();
unlink($tmpZipPath);

// GitHub extracts into a subfolder named: {repo-name}-{branch}
$repoName      = explode('/', GITHUB_REPO)[1]; // "alvin-id"
$extractedPath = $tmpExtractDir . '/' . $repoName . '-' . DEPLOY_BRANCH;

if (!is_dir($extractedPath)) {
    $found = glob($tmpExtractDir . '/*', GLOB_ONLYDIR);
    if (empty($found)) {
        fail('Could not locate extracted directory inside ZIP');
    }
    $extractedPath = $found[0];
}

// 8. Copy files to public_html (skip internal/sensitive items)
$skipList = ['.git', '.github', '.gitignore', '.DS_Store', 'deploy.php'];

function deployFiles(string $src, string $dst, array $skip): void
{
    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $skip, true)) continue;

        $srcPath = $src . DIRECTORY_SEPARATOR . $item;
        $dstPath = $dst . DIRECTORY_SEPARATOR . $item;

        if (is_dir($srcPath)) {
            if (!is_dir($dstPath)) mkdir($dstPath, 0755, true);
            deployFiles($srcPath, $dstPath, $skip);
        } else {
            copy($srcPath, $dstPath);
        }
    }
}

deployFiles($extractedPath, DEPLOY_DIR, $skipList);

// 9. Clean up temp directory
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

// 10. Log success
write_log('INFO', "Deploy successful — commit: {$commit}");
