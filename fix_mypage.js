const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

content = content.replace(
  'const [reportedVacancies, setReportedVacancies] = useState<any[]>([]);',
  `const [reportedVacancies, setReportedVacancies] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile && vacancies) {
      setReportedVacancies(vacancies.filter(v => v.registered_by === userProfile.id));
    }
  }, [userProfile, vacancies]);`
);

fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('Fixed MyPage.tsx');
