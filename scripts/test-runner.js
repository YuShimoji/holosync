/**
 * @file scripts/test-runner.js
 * @brief Playwrightテスト実行と成果物管理スクリプト
 *
 * 使用方法:
 *   node scripts/test-runner.js [options]
 *
 * オプション:
 *   --ui         UIモードで実行
 *   --debug      デバッグモードで実行
 *   --grep       特定テストのみ実行 (例: --grep "can add")
 *   --project    特定ブラウザのみ (chromium|firefox|webkit)
 *
 * 成果物出力先: test-artifacts/YYYY-MM/YYYY-MM-DD_NNN/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  artifactsDir: 'test-artifacts',
  playwrightReportDir: 'playwright-report',
  testResultsDir: 'test-results',
  retentionDays: 30,
};

/**
 * 日付フォーマット YYYY-MM-DD
 */
function getDateStr() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 年月フォーマット YYYY-MM
 */
function getYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 連番生成
 */
function getNextSequence(ymDir) {
  if (!fs.existsSync(ymDir)) {return '001';}

  const dirs = fs
    .readdirSync(ymDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{3}$/.test(d.name))
    .map((d) => d.name)
    .sort();

  if (dirs.length === 0) {return '001';}

  const last = dirs[dirs.length - 1];
  const seq = parseInt(last.split('_')[1], 10) + 1;
  return String(seq).padStart(3, '0');
}

/**
 * 成果物フォルダ準備
 */
function prepareArtifactDir() {
  const ym = getYearMonth();
  const ymDir = path.join(CONFIG.artifactsDir, ym);

  if (!fs.existsSync(CONFIG.artifactsDir)) {
    fs.mkdirSync(CONFIG.artifactsDir, { recursive: true });
  }

  if (!fs.existsSync(ymDir)) {
    fs.mkdirSync(ymDir, { recursive: true });
  }

  const seq = getNextSequence(ymDir);
  const dirName = `${getDateStr()}_${seq}`;
  const artifactDir = path.join(ymDir, dirName);

  // サブフォルダ作成
  ['report', 'screenshots', 'videos', 'traces'].forEach((sub) => {
    fs.mkdirSync(path.join(artifactDir, sub), { recursive: true });
  });

  return { artifactDir, ymDir, dirName, seq };
}

/**
 * Playwright実行
 */
function runPlaywright(options, artifactDir) {
  const args = ['playwright', 'test'];

  if (options.ui) {args.push('--ui');}
  if (options.debug) {args.push('--debug');}
  if (options.grep) {args.push(`--grep "${options.grep}"`);}
  if (options.project) {args.push(`--project="${options.project}"`);}

  // レポート出力先設定
  const reporterArgs = [
    `--reporter=html,list`,
    `--output=${path.join(artifactDir, 'test-results')}`,
  ];
  args.push(...reporterArgs);

  console.log(`▶️  テスト実行: npx ${args.join(' ')}`);
  console.log(`📁 成果物: ${artifactDir}\n`);

  try {
    execSync(`npx ${args.join(' ')}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_REPORT: path.join(artifactDir, 'report'),
      },
    });
    return true;
  } catch (e) {
    console.error('❌ テスト失敗');
    return false;
  }
}

/**
 * サマリーJSON生成
 */
function generateSummary(artifactDir, options, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const summary = {
    timestamp: new Date().toISOString(),
    duration: `${(duration / 1000).toFixed(1)}s`,
    options,
    directories: {
      report: './report/',
      screenshots: './screenshots/',
      videos: './videos/',
      traces: './traces/',
    },
  };

  fs.writeFileSync(path.join(artifactDir, 'summary.json'), JSON.stringify(summary, null, 2));

  return summary;
}

/**
 * index.htmlレポート生成
 */
function generateIndexHtml(artifactDir, dirName, summary) {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${dirName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #1a1a1a; }
    .meta {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .meta p { margin: 0.5rem 0; font-size: 0.9rem; color: #666; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .card:hover { transform: translateY(-2px); }
    .card h3 { font-size: 1rem; margin-bottom: 0.5rem; color: #444; }
    .card a {
      display: inline-block;
      margin-top: 0.5rem;
      color: #0066cc;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .card a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎭 Playwright Test Report</h1>
    <div class="meta">
      <p><strong>実行日時:</strong> ${summary.timestamp}</p>
      <p><strong>所要時間:</strong> ${summary.duration}</p>
      <p><strong>フォルダ:</strong> ${dirName}</p>
    </div>
    
    <div class="grid">
      <div class="card">
        <h3>📊 HTMLレポート</h3>
        <a href="./report/index.html">開く →</a>
      </div>
      <div class="card">
        <h3>📸 スクリーンショット</h3>
        <a href="./screenshots/">一覧 →</a>
      </div>
      <div class="card">
        <h3>🎥 動画</h3>
        <a href="./videos/">一覧 →</a>
      </div>
      <div class="card">
        <h3>🔍 トレース</h3>
        <a href="./traces/">一覧 →</a>
      </div>
      <div class="card">
        <h3>📝 サマリーJSON</h3>
        <a href="./summary.json">開く →</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(artifactDir, 'index.html'), html);
}

/**
 * シンボリックリンク更新
 */
function updateLatestLink(ymDir, dirName) {
  const latestLink = path.join(ymDir, 'latest');

  try {
    if (fs.existsSync(latestLink)) {
      fs.unlinkSync(latestLink);
    }
    fs.symlinkSync(dirName, latestLink, 'junction');
    console.log(`🔗 最新リンク更新: ${latestLink} -> ${dirName}`);
  } catch (e) {
    console.log('⚠️  シンボリックリンク作成スキップ (Windows管理者権限が必要)');
  }
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    ui: args.includes('--ui'),
    debug: args.includes('--debug'),
    grep: args.find((a, i) => args[i - 1] === '--grep') || null,
    project: args.find((a, i) => args[i - 1] === '--project') || null,
  };

  // 成果物フォルダ準備
  const { artifactDir, ymDir, dirName } = prepareArtifactDir();

  // テスト実行
  const startTime = Date.now();
  const success = runPlaywright(options, artifactDir);

  // サマリー生成
  const summary = generateSummary(artifactDir, options, startTime);

  // HTMLレポート生成
  generateIndexHtml(artifactDir, dirName, summary);

  // シンボリックリンク更新
  updateLatestLink(ymDir, dirName);

  console.log(`\n✅ 完了: ${artifactDir}`);
  console.log(`📊 レポート: ${path.join(artifactDir, 'index.html')}`);

  if (!success) {
    process.exit(1);
  }
}

main();
