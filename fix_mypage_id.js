const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

content = content.replace(
  'v.registered_by === userProfile.id',
  'v.registered_by === localStorage.getItem("gongsil_user_id")'
);

fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('Fixed MyPage.tsx user ID');
