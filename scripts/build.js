const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ROOT_FILES = ['index.html', 'ui.html'];
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const CSS_DIR = path.join(__dirname, '..', 'css');
const JS_DIR = path.join(__dirname, '..', 'js');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 复制文件
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

// 复制目录
function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

// 主构建函数
function build() {
  console.log('Starting build...');
  
  // 清理并创建 dist 目录
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  ensureDir(DIST_DIR);
  
  // 复制根文件
  ROOT_FILES.forEach(file => {
    const srcPath = path.join(__dirname, '..', file);
    const destPath = path.join(DIST_DIR, file);
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    }
  });
  
  // 复制资源目录
  if (fs.existsSync(ASSETS_DIR)) {
    copyDir(ASSETS_DIR, path.join(DIST_DIR, 'assets'));
  }
  
  // 复制 CSS 目录
  if (fs.existsSync(CSS_DIR)) {
    copyDir(CSS_DIR, path.join(DIST_DIR, 'css'));
  }
  
  // 复制 JS 目录
  if (fs.existsSync(JS_DIR)) {
    copyDir(JS_DIR, path.join(DIST_DIR, 'js'));
  }
  
  // 复制 public 目录
  if (fs.existsSync(PUBLIC_DIR)) {
    copyDir(PUBLIC_DIR, path.join(DIST_DIR, 'public'));
  }
  
  console.log('Build completed successfully!');
  console.log(`Output directory: ${DIST_DIR}`);
}

build();
