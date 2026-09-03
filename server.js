const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== 数据库初始化 ==========
const db = new sqlite3.Database('/data/agri.db', (err) => {
  if (err) console.error('数据库连接失败', err);
  else console.log('SQLite数据库已连接');
});

// 创建表结构
db.serialize(() => {
  // 用户表（默认村民）
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  // 惠农政策表
  db.run(`CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, category TEXT, content TEXT, date TEXT
  )`);

  // 农技知识表
  db.run(`CREATE TABLE IF NOT EXISTS agri_tech (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, category TEXT, content TEXT, crop_type TEXT
  )`);

  // 村务通知表
  db.run(`CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, content TEXT, publisher TEXT, date TEXT
  )`);

  // 种植档案表
  db.run(`CREATE TABLE IF NOT EXISTS plantings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, crop_type TEXT, variety TEXT, sow_date TEXT
  )`);

  // ---- 插入默认用户 ----
  db.run(`INSERT OR IGNORE INTO users (id, name) VALUES (1, '村民老王')`);

  // ---- 插入演示数据（惠农政策） ----
  db.run(`DELETE FROM policies`);
  const policies = [
    ['2026年水稻种植补贴新政', '补贴政策', '针对种粮大户，每亩补贴标准提高至150元，申报截止9月30日。', '2026-08-01'],
    ['农村土地经营权流转管理办法', '土地政策', '进一步规范土地流转程序，保障农户权益，严禁"非粮化"。', '2026-07-15'],
    ['特色农业产业保险试点', '保险政策', '将茶叶、水果等纳入地方特色保险，财政补贴保费80%。', '2026-06-20']
  ];
  policies.forEach(p => {
    db.run(`INSERT INTO policies (title, category, content, date) VALUES (?, ?, ?, ?)`, p);
  });

  // ---- 插入演示数据（农技知识） ----
  db.run(`DELETE FROM agri_tech`);
  const techs = [
    ['水稻抽穗期病虫害防治', '病虫害防治', '当前是水稻抽穗期，请注意防治稻瘟病和纹枯病，推荐使用三环唑和井岗霉素。', '水稻'],
    ['早稻播种关键技术', '播种时节', '日均温稳定通过12℃时播种，育秧期间注意保温防寒，秧龄控制在25-30天。', '水稻'],
    ['水稻灌浆期水肥管理', '田间管理', '灌浆期保持田间湿润，追施粒肥每亩5公斤尿素，促进籽粒饱满。', '水稻'],
    ['玉米螟绿色防控技术', '病虫害防治', '利用赤眼蜂卵卡防治玉米螟，每代释放2次，环保高效。', '玉米']
  ];
  techs.forEach(t => {
    db.run(`INSERT INTO agri_tech (title, category, content, crop_type) VALUES (?, ?, ?, ?)`, t);
  });

  // ---- 插入演示数据（村务通知） ----
  db.run(`DELETE FROM notices`);
  const notices = [
    ['村民代表大会通知', '兹定于9月10日上午9点在村委会议室召开村民代表大会，讨论年底分红方案。', '村支书 李建国', '2026-09-01'],
    ['台风"摩羯"防御预警', '据气象部门预警，第12号台风将于9月5日影响我市，请提前做好大棚加固和田间排水。', '村委会', '2026-09-02']
  ];
  notices.forEach(n => {
    db.run(`INSERT INTO notices (title, content, publisher, date) VALUES (?, ?, ?, ?)`, n);
  });

  // ---- 插入演示数据（种植档案 - 关联用户1） ----
  db.run(`DELETE FROM plantings`);
  db.run(`INSERT INTO plantings (user_id, crop_type, variety, sow_date) VALUES (1, '水稻', '湘两优900', '2026-06-15')`);
});

// ========== API 路由 ==========

// 1. 获取政策（分类+搜索）
app.get('/api/policies', (req, res) => {
  const { category, keyword } = req.query;
  let sql = `SELECT * FROM policies WHERE 1=1`;
  const params = [];
  if (category && category !== '全部') {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (keyword) {
    sql += ` AND (title LIKE ? OR content LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ` ORDER BY date DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. 获取农技（分类+搜索）
app.get('/api/agri-tech', (req, res) => {
  const { category, keyword } = req.query;
  let sql = `SELECT * FROM agri_tech WHERE 1=1`;
  const params = [];
  if (category && category !== '全部') {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (keyword) {
    sql += ` AND (title LIKE ? OR content LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. 获取村务通知
app.get('/api/notices', (req, res) => {
  db.all(`SELECT * FROM notices ORDER BY date DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 4. 发布村务通知（村干部后台）
app.post('/api/notices', (req, res) => {
  const { title, content, publisher } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  const date = new Date().toISOString().slice(0, 10);
  db.run(`INSERT INTO notices (title, content, publisher, date) VALUES (?, ?, ?, ?)`,
    [title, content, publisher || '村干部', date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '发布成功' });
    }
  );
});

// 5. 获取种植档案
app.get('/api/plantings', (req, res) => {
  db.all(`SELECT * FROM plantings WHERE user_id = 1`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 6. 创建/更新种植档案
app.post('/api/plantings', (req, res) => {
  const { crop_type, variety, sow_date } = req.body;
  if (!crop_type || !sow_date) {
    return res.status(400).json({ error: '作物类型和播种日期必填' });
  }
  db.run(`DELETE FROM plantings WHERE user_id = 1`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`INSERT INTO plantings (user_id, crop_type, variety, sow_date) VALUES (1, ?, ?, ?)`,
      [crop_type, variety || '常规品种', sow_date],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: '档案保存成功' });
      }
    );
  });
});

// 7. AI农事提醒（核心：基于水稻生长周期）
app.get('/api/reminders', (req, res) => {
  db.get(`SELECT * FROM plantings WHERE user_id = 1`, (err, planting) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!planting) {
      return res.json([{ text: '请先在"我的"页面创建种植档案，以便获取精准提醒。', level: 'info' }]);
    }

    const { crop_type, sow_date } = planting;
    const today = new Date();
    const sow = new Date(sow_date);
    const diffDays = Math.floor((today - sow) / (1000 * 60 * 60 * 24));

    let reminders = [];
    if (crop_type.includes('水稻') && diffDays >= 0) {
      if (diffDays <= 15) {
        reminders.push({ text: '🌱 当前为水稻幼苗期，注意保持浅水层，及时查苗补缺。', level: 'info' });
      } else if (diffDays <= 35) {
        reminders.push({ text: '🌾 水稻进入分蘖期，建议追施分蘖肥（尿素5-8公斤/亩），保持3-5厘米水层。', level: 'info' });
      } else if (diffDays <= 55) {
        reminders.push({ text: '💧 水稻拔节期，注意晒田控苗，一般晒田5-7天，控制无效分蘖。', level: 'warning' });
      } else if (diffDays <= 75) {
        reminders.push({ text: '🚨 当前是水稻抽穗期，请注意防治稻瘟病！同时关注稻飞虱发生情况。', level: 'danger' });
        reminders.push({ text: '🌧️ 抽穗期遇连续阴雨，建议雨后及时喷施三环唑预防穗颈瘟。', level: 'warning' });
      } else if (diffDays <= 95) {
        reminders.push({ text: '🌞 水稻灌浆期，保持田间湿润，追施粒肥（钾肥3-5公斤/亩），提高结实率。', level: 'info' });
      } else if (diffDays <= 115) {
        reminders.push({ text: '🍂 水稻进入蜡熟期，注意间歇灌溉，干干湿湿，防止早衰。', level: 'info' });
      } else {
        reminders.push({ text: '⚡ 水稻已成熟，建议抓住晴好天气及时收割，注意晾晒归仓。', level: 'warning' });
      }
      reminders.push({ text: '📢 未来三天有间断小雨，建议提前做好田间排水沟清理。', level: 'info' });
    } else {
      reminders.push({ text: `📋 当前种植的作物是"${crop_type}"，系统将持续更新该作物的管理建议。`, level: 'info' });
    }
    res.json(reminders);
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🌾 智慧乡村·惠农通 H5应用已启动！`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
});