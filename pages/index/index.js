// 吉兆签文库（参考设计）
const FORTUNES = [
  { title: '大吉', content: '云开月明，好事将至。', blessing: '心想事成，万事如意' },
  { title: '上上签', content: '春风得意，贵人相助。', blessing: '福星高照，吉祥如意' },
  { title: '吉', content: '顺风顺水，平安喜乐。', blessing: '诸事顺遂，笑口常开' },
  { title: '大吉', content: '否极泰来，转运在即。', blessing: '好运连连，步步高升' },
  { title: '上吉', content: '心诚则灵，静候花开。', blessing: '心想事成，美梦成真' },
  { title: '大吉', content: '紫气东来，福气满满。', blessing: '财源广进，福禄双全' },
  { title: '上上签', content: '吉星拱照，喜事临门。', blessing: '大展宏图，前程似锦' },
  { title: '吉', content: '静心守候，惊喜将至。', blessing: '平安顺遂，和气致祥' }
];

// 背景主题
const BACKGROUNDS = [
  { id: 'gradient1', name: '禅意渐变', class: 'bg-gradient1' },
  { id: 'gradient2', name: '祥云', class: 'bg-gradient2' },
  { id: 'gradient3', name: '静心', class: 'bg-gradient3' },
  { id: 'gradient4', name: '暖阳', class: 'bg-gradient4' },
  { id: 'solid1', name: '素白', class: 'bg-solid1' },
  { id: 'solid2', name: '米黄', class: 'bg-solid2' }
];

Page({
  data: {
    meritCount: 0,
    todayMerit: 0,
    totalMerit: 0,
    lastMeritDate: '',
    isShaking: false,
    showFloat: false,
    floatingMerits: [], // 存储多个浮动文字
    showStick: false, // 显示木鱼棒
    autoTapping: false, // 自动敲击状态
    autoTapTimer: null, // 自动敲击定时器
    canDrawToday: true,
    isDrawing: false,
    showFortune: false,
    fortuneAnimating: false,
    currentFortune: null,
    showWishWall: false,
    wishInput: '',
    wishes: [],
    showBlessing: false,
    blessingItems: [],
    backgrounds: BACKGROUNDS,
    currentBg: BACKGROUNDS[0].class,
    currentBgIndex: 0,
    showBgSelector: false,
    longPressTimer: null,
    pressStartTime: 0,
    statusBarHeight: 0,
    customBarHeight: 0,
    menuButtonInfo: null,
    safeAreaBottom: 0, // 底部安全区高度
    // 拖拽相关
    themeBtnLeft: 0,
    themeBtnTop: 0,
    themeBtnStartX: 0,
    themeBtnStartY: 0,
    isDragging: false,
    themeBtnAnimating: false,
    windowWidth: 0,
    windowHeight: 0,
    // 自定义提示框
    showCustomToast: false,
    toastMessage: '',
    toastIcon: '',
    // 自定义确认框
    showCustomModal: false,
    modalTitle: '',
    modalContent: '',
    modalCallback: null,
    // 彩蛋祝福语
    blessingTexts: ['福气满满', '好运连连', '心想事成', '万事如意', '吉祥如意', '福星高照'],
    blessingMerits: [6, 8, 10, 18, 28, 66, 88, 168],
    currentBlessingText: '福气满满',
    currentBlessingMerit: 10,
    // 音频
    audioContext: null
  },

  onLoad() {
    this.getSystemInfo();
    this.loadData();
    this.checkDailyReset();
    
    // 初始化音频
    this.data.audioContext = wx.createInnerAudioContext();
    this.data.audioContext.src = '/assets/audio/muyu.mp3';
  },

  onUnload() {
    // 页面卸载时停止自动敲击
    this.stopAutoTap();
    
    // 页面卸载时销毁音频
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
  },

  // 获取系统信息，计算状态栏高度
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const customBarHeight = statusBarHeight + 44; // 状态栏高度 + 导航栏高度
    const windowWidth = systemInfo.windowWidth;
    const windowHeight = systemInfo.windowHeight;
    const screenHeight = systemInfo.screenHeight;
    
    // 计算底部安全区高度
    const safeAreaBottom = screenHeight - systemInfo.safeArea.bottom;
    
    // 获取胶囊按钮位置信息
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    
    // 初始化 theme-btn 位置（右侧垂直居中）
    const btnSize = 40; // 按钮尺寸（px）
    const padding = 20; // 边距（px）
    const themeBtnLeft = windowWidth - btnSize - padding;
    const themeBtnTop = (windowHeight - btnSize) / 2;
    
    this.setData({
      statusBarHeight,
      customBarHeight,
      menuButtonInfo,
      windowWidth,
      windowHeight,
      safeAreaBottom,
      themeBtnLeft,
      themeBtnTop
    });
  },

  // 自定义 Toast
  showToast(message, icon = 'none') {
    this.setData({
      showCustomToast: true,
      toastMessage: message,
      toastIcon: icon
    });
    
    setTimeout(() => {
      this.setData({ showCustomToast: false });
    }, 2000);
  },

  // 自定义 Modal
  showModal(title, content, callback) {
    this.setData({
      showCustomModal: true,
      modalTitle: title,
      modalContent: content,
      modalCallback: callback
    });
  },

  // 确认 Modal
  confirmModal() {
    this.setData({ showCustomModal: false });
    if (this.data.modalCallback) {
      this.data.modalCallback(true);
    }
  },

  // 取消 Modal
  cancelModal() {
    this.setData({ showCustomModal: false });
    if (this.data.modalCallback) {
      this.data.modalCallback(false);
    }
  },

  loadData() {
    const totalMerit = wx.getStorageSync('totalMerit') || 0;
    const todayMerit = wx.getStorageSync('todayMerit') || 0;
    const lastMeritDate = wx.getStorageSync('lastMeritDate') || '';
    const lastDrawDate = wx.getStorageSync('lastDrawDate') || '';
    const currentFortune = wx.getStorageSync('currentFortune') || null;
    const wishes = wx.getStorageSync('wishes') || [];
    const bgIndex = wx.getStorageSync('bgIndex') || 0;
    const today = this.getToday();
    
    // 检查是否是新的一天，重置今日功德
    let newTodayMerit = todayMerit;
    if (lastMeritDate !== today) {
      newTodayMerit = 0;
      wx.setStorageSync('todayMerit', 0);
      wx.setStorageSync('lastMeritDate', today);
    }
    
    this.setData({
      totalMerit,
      todayMerit: newTodayMerit,
      meritCount: totalMerit,
      lastMeritDate: lastMeritDate || today,
      canDrawToday: lastDrawDate !== today,
      currentFortune: lastDrawDate === today ? currentFortune : null,
      wishes,
      currentBgIndex: bgIndex,
      currentBg: BACKGROUNDS[bgIndex].class
    });
  },

  // 检查每日重置
  checkDailyReset() {
    const lastDrawDate = wx.getStorageSync('lastDrawDate') || '';
    const today = this.getToday();
    
    if (lastDrawDate && lastDrawDate !== today) {
      this.showToast('今日吉签已刷新', 'none');
    }
  },

  // 处理触摸开始（用于长按检测）
  handleTouchStart() {
    // 自动敲击时禁止手动操作
    if (this.data.autoTapping) return;
    
    this.data.pressStartTime = Date.now();
    this.data.longPressTimer = setTimeout(() => {
      this.longPressMuyu();
    }, 3000);
  },

  // 处理触摸结束
  handleTouchEnd() {
    // 自动敲击时禁止手动操作
    if (this.data.autoTapping) return;
    
    const pressDuration = Date.now() - this.data.pressStartTime;
    clearTimeout(this.data.longPressTimer);
    
    // 如果按压时间小于3秒，执行普通点击
    if (pressDuration < 3000) {
      this.tapMuyu();
    }
  },

  // 敲击木鱼
  tapMuyu() {
    // 显示木鱼棒敲击动画
    this.setData({ showStick: true });
    setTimeout(() => {
      this.setData({ showStick: false });
    }, 300);
    
    // 播放音效
    if (this.data.audioContext) {
      this.data.audioContext.stop();
      this.data.audioContext.seek(0);
      this.data.audioContext.play();
    }
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
    
    // 木鱼晃动动画
    this.setData({ isShaking: true });
    setTimeout(() => {
      this.setData({ isShaking: false });
    }, 300);
    
    // 增加功德值
    const newTodayMerit = this.data.todayMerit + 1;
    const newTotalMerit = this.data.totalMerit + 1;
    this.setData({ 
      todayMerit: newTodayMerit,
      totalMerit: newTotalMerit,
      meritCount: newTotalMerit
    });
    wx.setStorageSync('todayMerit', newTodayMerit);
    wx.setStorageSync('totalMerit', newTotalMerit);
    wx.setStorageSync('lastMeritDate', this.getToday());
    
    // 添加浮动文字
    const floatId = Date.now() + Math.random();
    const newFloatingMerits = [...this.data.floatingMerits, {
      id: floatId,
      show: true
    }];
    this.setData({ floatingMerits: newFloatingMerits });
    
    // 800ms后移除这个浮动文字
    setTimeout(() => {
      const updatedMerits = this.data.floatingMerits.filter(item => item.id !== floatId);
      this.setData({ floatingMerits: updatedMerits });
    }, 800);
  },

  // 长按木鱼彩蛋
  longPressMuyu() {
    wx.vibrateShort({ type: 'heavy' });
    
    // 随机选择祝福语和功德值
    const randomText = this.data.blessingTexts[Math.floor(Math.random() * this.data.blessingTexts.length)];
    const randomMerit = this.data.blessingMerits[Math.floor(Math.random() * this.data.blessingMerits.length)];
    
    // 根据功德值生成对应数量的特效（全屏分布）
    const items = [];
    const itemCount = Math.min(randomMerit, 100); // 最多100个
    for (let i = 0; i < itemCount; i++) {
      items.push({
        icon: i % 2 === 0 ? '✨' : '☁️',
        left: Math.random() * 100,
        delay: Math.random() * 1
      });
    }
    
    this.setData({ 
      showBlessing: true,
      blessingItems: items,
      currentBlessingText: randomText,
      currentBlessingMerit: randomMerit
    });
    
    // 额外功德值
    const newTodayMerit = this.data.todayMerit + randomMerit;
    const newTotalMerit = this.data.totalMerit + randomMerit;
    this.setData({ 
      todayMerit: newTodayMerit,
      totalMerit: newTotalMerit,
      meritCount: newTotalMerit
    });
    wx.setStorageSync('todayMerit', newTodayMerit);
    wx.setStorageSync('totalMerit', newTotalMerit);
    wx.setStorageSync('lastMeritDate', this.getToday());
    
    setTimeout(() => {
      this.setData({ showBlessing: false });
    }, 3000);
  },

  // 抽签
  drawLottery() {
    if (!this.data.canDrawToday || this.data.isDrawing) return;
    
    this.setData({ isDrawing: true });
    wx.vibrateShort({ type: 'medium' });
    
    setTimeout(() => {
      // 随机抽取吉签
      const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      const today = this.getToday();
      const currentFortune = {
        ...fortune,
        date: today
      };
      
      // 保存抽签记录
      wx.setStorageSync('lastDrawDate', today);
      wx.setStorageSync('currentFortune', currentFortune);
      
      // 显示抽签动画
      this.setData({ 
        fortuneAnimating: true,
        showFortune: true,
        currentFortune,
        canDrawToday: false,
        isDrawing: false
      });
      
      setTimeout(() => {
        this.setData({ fortuneAnimating: false });
      }, 800);
    }, 1500);
  },

  // 关闭抽签弹窗
  closeFortune() {
    this.setData({ showFortune: false });
  },

  // 保存签文
  saveFortune() {
    this.generateFortuneImage((tempFilePath) => {
      wx.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => {
          this.showToast('已保存到相册', 'success');
        },
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            this.showModal('提示', '需要授权保存到相册', (confirm) => {
              if (confirm) {
                wx.openSetting();
              }
            });
          } else {
            this.showToast('保存失败', 'none');
          }
        }
      });
    });
  },

  // 点击分享按钮（生成图片分享）
  showShareImageMenu() {
    this.generateFortuneImage((tempFilePath) => {
      wx.showShareImageMenu({
        path: tempFilePath,
        success: () => {
          console.log('分享成功');
        },
        fail: (err) => {
          console.error('分享失败', err);
          this.showToast('分享失败', 'none');
        }
      });
    });
  },

  // 生成签文图片
  generateFortuneImage(callback) {
    const { currentFortune } = this.data;
    if (!currentFortune) return;
    
    wx.showLoading({ title: '生成图片中...' });
    
    // 创建 canvas 绘制上下文
    const query = wx.createSelectorQuery();
    query.select('#fortuneCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          wx.hideLoading();
          this.showToast('生成失败', 'none');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 设置 canvas 尺寸
        canvas.width = 650 * dpr;
        canvas.height = 900 * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制背景
        const gradient = ctx.createLinearGradient(0, 0, 0, 900);
        gradient.addColorStop(0, '#FEF3C7');
        gradient.addColorStop(1, '#FFFBEB');
        ctx.fillStyle = gradient;
        
        // 绘制圆角矩形
        this.drawRoundRect(ctx, 0, 0, 650, 900, 40);
        ctx.fill();
        
        // 绘制标题 "吉"
        ctx.fillStyle = '#DC2626';
        ctx.font = 'bold 120px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentFortune.title, 325, 150);
        
        // 绘制日期
        ctx.fillStyle = '#D97706';
        ctx.font = '28px sans-serif';
        ctx.fillText(currentFortune.date, 325, 210);
        
        // 绘制分隔线
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(175, 270, 150, 3);
        ctx.beginPath();
        ctx.arc(325, 271.5, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillRect(325, 270, 150, 3);
        
        // 绘制签文内容
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(currentFortune.content, 325, 370);
        
        // 绘制祝福语
        ctx.fillStyle = '#D97706';
        ctx.font = '36px sans-serif';
        ctx.fillText(currentFortune.blessing, 325, 450);
        
        // 绘制云朵装饰
        ctx.fillStyle = 'rgba(253, 230, 138, 0.6)';
        [225, 325, 425].forEach((x) => {
          ctx.beginPath();
          ctx.ellipse(x, 540, 40, 20, 0, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        // 绘制底部文字
        ctx.fillStyle = '#92400E';
        ctx.font = '24px sans-serif';
        ctx.fillText('木鱼吉兆签 · 佛系治愈', 325, 800);
        
        // 导出图片
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas,
            success: (canvasRes) => {
              wx.hideLoading();
              callback && callback(canvasRes.tempFilePath);
            },
            fail: () => {
              wx.hideLoading();
              this.showToast('生成失败', 'none');
            }
          });
        }, 100);
      });
  },

  // 绘制圆角矩形
  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  },

  // 分享配置（从胶囊按钮分享给好友）
  onShareAppMessage() {
    const { todayMerit, totalMerit } = this.data;
    
    return {
      title: `我的功德：今日${todayMerit}，总计${totalMerit} - 木鱼吉兆签`,
      path: '/pages/index/index',
      imageUrl: '' // 使用默认截图
    };
  },

  // 分享到朋友圈（从胶囊按钮分享）
  onShareTimeline() {
    const { todayMerit, totalMerit } = this.data;
    
    return {
      title: `我的功德：今日${todayMerit}，总计${totalMerit} - 木鱼吉兆签`,
      imageUrl: '' // 使用默认截图
    };
  },

  // 打开祈愿墙
  openWishWall() {
    this.setData({ showWishWall: true });
  },

  // 关闭祈愿墙
  closeWishWall() {
    this.setData({ showWishWall: false, wishInput: '' });
  },

  // 输入心愿
  onWishInput(e) {
    this.setData({ wishInput: e.detail.value });
  },

  // 提交心愿
  submitWish() {
    const wishText = this.data.wishInput.trim();
    if (!wishText) {
      this.showToast('请输入心愿', 'none');
      return;
    }
    
    // 检查数量限制
    if (this.data.wishes.length >= 100) {
      this.showToast('心愿墙已满（最多100个）', 'none');
      return;
    }
    
    // 检查是否重复
    const isDuplicate = this.data.wishes.some(wish => wish.text === wishText);
    if (isDuplicate) {
      this.showToast('该心愿已存在', 'none');
      return;
    }
    
    wx.vibrateShort({ type: 'light' });
    
    // 添加心愿到列表
    const newWish = {
      id: Date.now().toString(),
      text: wishText,
      date: this.formatDate(new Date())
    };
    
    const wishes = [newWish, ...this.data.wishes];
    this.setData({ wishes, wishInput: '' });
    wx.setStorageSync('wishes', wishes);
    
    this.showToast('心愿已挂上祈福墙', 'success');
  },

  // 删除心愿
  deleteWish(e) {
    const { id } = e.currentTarget.dataset;
    
    this.showModal('提示', '确定要删除这个心愿吗？', (confirm) => {
      if (confirm) {
        const wishes = this.data.wishes.filter(wish => wish.id !== id);
        this.setData({ wishes });
        wx.setStorageSync('wishes', wishes);
        
        this.showToast('已删除', 'success');
      }
    });
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 切换背景选择器
  toggleThemeSelector() {
    // 只有在非拖拽状态下才切换
    if (!this.data.isDragging) {
      this.setData({ showBgSelector: !this.data.showBgSelector });
    }
  },

  // 清零功德
  resetMerit() {
    this.showModal('清零功德', '确定要清零所有功德吗？', (confirm) => {
      if (confirm) {
        this.setData({
          todayMerit: 0,
          totalMerit: 0,
          meritCount: 0
        });
        wx.setStorageSync('todayMerit', 0);
        wx.setStorageSync('totalMerit', 0);
        this.showToast('功德已清零', 'success');
      }
    });
  },

  // theme-btn 拖拽开始
  themeBtnTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      themeBtnStartX: touch.clientX - this.data.themeBtnLeft,
      themeBtnStartY: touch.clientY - this.data.themeBtnTop,
      isDragging: false,
      themeBtnAnimating: false
    });
  },

  // theme-btn 拖拽中
  themeBtnTouchMove(e) {
    const touch = e.touches[0];
    const left = touch.clientX - this.data.themeBtnStartX;
    const top = touch.clientY - this.data.themeBtnStartY;
    
    // 标记为拖拽状态
    this.setData({
      isDragging: true,
      themeBtnLeft: left,
      themeBtnTop: top
    });
  },

  // theme-btn 拖拽结束
  themeBtnTouchEnd() {
    const { themeBtnLeft, themeBtnTop, windowWidth, windowHeight, statusBarHeight } = this.data;
    const btnSize = 40; // 按钮尺寸（px）
    const padding = 20; // 边距（px）
    
    // 计算中心点
    const centerX = themeBtnLeft + btnSize / 2;
    const centerY = themeBtnTop + btnSize / 2;
    
    // 判断靠近哪一边
    let finalLeft = themeBtnLeft;
    let finalTop = themeBtnTop;
    
    // 左右贴边
    if (centerX < windowWidth / 2) {
      // 靠左
      finalLeft = padding;
    } else {
      // 靠右
      finalLeft = windowWidth - btnSize - padding;
    }
    
    // 限制上下范围
    const minTop = statusBarHeight + 8;
    const maxTop = windowHeight - btnSize - padding;
    finalTop = Math.max(minTop, Math.min(maxTop, themeBtnTop));
    
    // 缓动贴边（使用 transition 实现平滑动画）
    this.setData({
      themeBtnLeft: finalLeft,
      themeBtnTop: finalTop,
      themeBtnAnimating: true
    });
    
    // 延迟重置拖拽状态和动画状态
    setTimeout(() => {
      this.setData({ 
        isDragging: false,
        themeBtnAnimating: false
      });
    }, 300);
  },

  // 选择背景
  selectBackground(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentBgIndex: index,
      currentBg: BACKGROUNDS[index].class,
      showBgSelector: false
    });
    
    wx.setStorageSync('bgIndex', index);
    
    this.showToast(`已切换至${BACKGROUNDS[index].name}`, 'none');
  },

  // 分享到朋友圈（生成图片）
  onShareTimeline() {
    return {
      title: '木鱼吉兆签 - 佛系治愈 · 解压祈福',
      imageUrl: '' // 使用默认截图
    };
  },

  // 分享功德到朋友圈
  shareMeritToTimeline() {
    this.generateMeritImage((tempFilePath) => {
      // 保存图片路径供分享使用
      this.setData({ shareImagePath: tempFilePath });
      
      // 提示用户通过右上角分享
      this.showModal('分享到朋友圈', '请点击右上角"..."按钮，选择"分享到朋友圈"', () => {});
    });
  },

  // 分享功德统计
  shareMerit() {
    this.generateMeritImage((tempFilePath) => {
      wx.showShareImageMenu({
        path: tempFilePath,
        success: () => {
          console.log('分享成功');
        },
        fail: (err) => {
          console.error('分享失败', err);
          // 分享失败不显示提示
        }
      });
    });
  },

  // 获取当前背景的渐变色
  getCurrentBgGradient() {
    const bgGradients = {
      'bg-gradient1': ['#FEF3C7', '#FFEDD5', '#FEE2E2'],
      'bg-gradient2': ['#EFF6FF', '#F3E8FF', '#FCE7F3'],
      'bg-gradient3': ['#ECFDF5', '#E0F2FE', '#CFFAFE'],
      'bg-gradient4': ['#FEFCE8', '#FEF3C7', '#FFEDD5'],
      'bg-solid1': ['#F5F5F4', '#F5F5F4'],
      'bg-solid2': ['#FEF3C7', '#FEF3C7']
    };
    return bgGradients[this.data.currentBg] || ['#FEF3C7', '#FFEDD5'];
  },

  // 生成功德统计图片
  generateMeritImage(callback) {
    const { todayMerit, totalMerit } = this.data;
    const today = this.formatDate(new Date());
    const bgColors = this.getCurrentBgGradient();
    
    wx.showLoading({ title: '生成图片中...' });
    
    const query = wx.createSelectorQuery();
    query.select('#meritCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          wx.hideLoading();
          this.showToast('生成失败', 'none');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 设置 canvas 尺寸
        canvas.width = 600 * dpr;
        canvas.height = 800 * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制背景（使用当前选择的背景色）
        const gradient = ctx.createLinearGradient(0, 0, 0, 800);
        if (bgColors.length === 2) {
          gradient.addColorStop(0, bgColors[0]);
          gradient.addColorStop(1, bgColors[1]);
        } else {
          gradient.addColorStop(0, bgColors[0]);
          gradient.addColorStop(0.5, bgColors[1]);
          gradient.addColorStop(1, bgColors[2]);
        }
        ctx.fillStyle = gradient;
        this.drawRoundRect(ctx, 0, 0, 600, 800, 40);
        ctx.fill();
        
        // 绘制标题
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('木鱼吉兆签', 300, 100);
        
        // 绘制日期
        ctx.fillStyle = '#D97706';
        ctx.font = '24px sans-serif';
        ctx.fillText(today, 300, 150);
        
        // 绘制功德卡片背景（上下对称）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.drawRoundRect(ctx, 80, 260, 440, 320, 30);
        ctx.fill();
        
        // 绘制总功德
        ctx.fillStyle = '#D97706';
        ctx.font = '28px sans-serif';
        ctx.fillText('总功德', 300, 320);
        
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 80px sans-serif';
        ctx.fillText(totalMerit.toString(), 300, 395);
        
        // 绘制分隔线
        ctx.fillStyle = '#FCD34D';
        ctx.fillRect(150, 455, 300, 2);
        
        // 绘制今日功德
        ctx.fillStyle = '#D97706';
        ctx.font = '28px sans-serif';
        ctx.fillText('今日功德', 300, 495);
        
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 60px sans-serif';
        ctx.fillText(todayMerit.toString(), 300, 550);
        
        // 绘制底部文字
        ctx.fillStyle = '#92400E';
        ctx.font = '24px sans-serif';
        ctx.fillText('佛系治愈 · 解压祈福', 300, 680);
        
        // 绘制装饰云朵
        ctx.fillStyle = 'rgba(253, 230, 138, 0.5)';
        [200, 300, 400].forEach((x) => {
          ctx.beginPath();
          ctx.ellipse(x, 620, 30, 15, 0, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        // 导出图片
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas,
            success: (canvasRes) => {
              wx.hideLoading();
              callback && callback(canvasRes.tempFilePath);
            },
            fail: () => {
              wx.hideLoading();
              this.showToast('生成失败', 'none');
            }
          });
        }, 100);
      });
  },

  // 导航到其他小程序
  navigateToMiniProgram(e) {
    const { appid, name } = e.currentTarget.dataset;
    wx.navigateToMiniProgram({
      appId: appid,
      success: () => {
        console.log(`成功跳转到${name}`);
      },
      fail: (err) => {
        console.error('跳转失败', err);
        this.showToast('跳转失败，请稍后重试', 'none');
      }
    });
  },

  // 启动自动敲击
  startAutoTap() {
    if (this.data.autoTapTimer) return;
    
    this.setData({ autoTapping: true });
    
    this.data.autoTapTimer = setInterval(() => {
      this.tapMuyu();
    }, 1000);
  },

  // 停止自动敲击
  stopAutoTap() {
    if (this.data.autoTapTimer) {
      clearInterval(this.data.autoTapTimer);
      this.data.autoTapTimer = null;
    }
    this.setData({ autoTapping: false });
  },

  // 切换自动敲击
  toggleAutoTap() {
    if (this.data.autoTapping) {
      this.stopAutoTap();
      this.showToast('已停止自动敲击', 'none');
    } else {
      this.startAutoTap();
      this.showToast('已开启自动敲击', 'none');
    }
  },

  // 获取今日日期
  getToday() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }
});
