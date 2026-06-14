const fs = require('fs');
const path = require('path');

const pages = [
  "announcements", "notifications", "positions", "recruitment", 
  "shifts", "leave", "overtime", "meeting-rooms", 
  "benefits", "social-security", "loans", "expenses", 
  "training", "onboarding", "evaluations", "rewards", 
  "assets", "documents", "company-trips", "business-trips", 
  "discipline", "resignations", "reports", "line-oa", "settings"
];

pages.forEach(p => {
  const dir = path.join(__dirname, 'app', p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const title = p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  const content = `export default function Page() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">${title}</h2>
        <p className="text-textMuted text-sm">ระบบกำลังอยู่ระหว่างการพัฒนา</p>
      </div>
      <div className="bg-cardDark border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-brandPurple/20 flex items-center justify-center mb-4">
           <span className="text-2xl">🚀</span>
        </div>
        <h3 className="text-white font-medium text-lg">Coming Soon</h3>
        <p className="text-textMuted text-sm text-center max-w-sm mt-2">
          ฟีเจอร์ ${title} จะเปิดให้ใช้งานในเร็วๆ นี้ พร้อมการเชื่อมต่อข้อมูล
        </p>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(dir, 'page.tsx'), content, 'utf8');
});
console.log('Done');
