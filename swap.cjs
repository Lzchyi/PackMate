const fs = require('fs');
const path = require('path');

const filePath = './src/components/ProfileView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const notifBlock = `        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={\`p-2 rounded-lg \${profile?.masterNotificationsEnabled !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 '}\`}>
              {profile?.masterNotificationsEnabled !== false ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t('profile.notifications')}</h3>
                <button 
                  onClick={() => setShowNotificationInfo(true)}
                  className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 ">{t('profile.notificationsDescription')}</p>
            </div>
          </div>
          <button
            onClick={handleToggleMasterNotifications}
            className={\`w-12 h-6 rounded-full transition-colors relative \${profile?.masterNotificationsEnabled !== false ? 'bg-emerald-500' : 'bg-stone-300'}\`}
          >
            <div className={\`absolute top-1 w-4 h-4 bg-white dark:bg-stone-900 rounded-full transition-all \${profile?.masterNotificationsEnabled !== false ? 'right-1' : 'left-1'}\`} />
          </button>
        </div>`;

const langBlock = `        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.language')}</h3>
          </div>
          <div className="flex flex-nowrap bg-stone-100 dark:bg-stone-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleLanguageChange('en-GB')}
              className={\`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap \${i18n.language === 'en-GB' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 '}\`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('zh-CN')}
              className={\`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap \${i18n.language === 'zh-CN' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 '}\`}
            >
              简体中文
            </button>
          </div>
        </div>`;

const original = notifBlock + '\n\n' + langBlock;
const replacement = langBlock + '\n\n' + notifBlock;

if (content.includes(original)) {
  content = content.replace(original, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Swapped successfully!');
} else {
  console.log('Could not find the exact block to swap.');
}
