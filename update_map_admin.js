const fs = require('fs');
let content = fs.readFileSync('src/components/MapInterface.tsx', 'utf8');

// Add useEffect for window.showAdminDashboard
const useEffectInjection = `
  useEffect(() => {
    (window as any).showAdminDashboard = () => setShowAdmin(true);
    return () => {
      delete (window as any).showAdminDashboard;
    };
  }, []);
`;

content = content.replace(
  'const mapRef = useRef<kakao.maps.Map>(null);',
  `const mapRef = useRef<kakao.maps.Map>(null);\n${useEffectInjection}`
);

// Render AdminDashboard before footer
const renderAdminDashboard = `
        {/* Admin Dashboard */}
        <AnimatePresence>
          {showAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: "100%" }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-[200] bg-slate-50 overflow-y-auto"
            >
              <AdminDashboard 
                onBack={() => setShowAdmin(false)} 
                vacancies={vacancies}
                onUpdateVacancy={(updatedV) => {
                  setVacancies(prev => prev.map(v => v.id === updatedV.id ? updatedV : v));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden md:flex absolute bottom-2 left-4 z-[300]`;

content = content.replace(
  '<div className="hidden md:flex absolute bottom-2 left-4 z-[300]',
  renderAdminDashboard
);

fs.writeFileSync('src/components/MapInterface.tsx', content);
console.log('Modified MapInterface.tsx');
