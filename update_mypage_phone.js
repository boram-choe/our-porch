const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

// Add state variables
content = content.replace(
  /const \[isPurchasing, setIsPurchasing\] = useState\(false\);/,
  `const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedGifticon, setSelectedGifticon] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");`
);

// Replace the onClick of the exchange button
const oldButton = `onClick={async () => {
                       if (totalPoints < item.price) {
                         alert("포인트가 부족합니다!");
                         return;
                       }
                       if (confirm(\`'\${item.name}' 상품을 교환하시겠습니까?\\n차감 포인트: \${item.price}P\`)) {
                         setIsPurchasing(true);
                         const userId = localStorage.getItem("gongsil_user_id");
                         if (!userId) {
                           setIsPurchasing(false);
                           return;
                         }
                         const res = await purchaseGifticon(userId, item.id, item.name, item.price);
                         alert(res.message);
                         if (res.success) {
                           const newReqs = await fetchGifticonRequests(userId);
                           setGifticonRequests(newReqs);
                         }
                         setIsPurchasing(false);
                       }
                     }}`;

const newButton = `onClick={() => {
                       if (totalPoints < item.price) {
                         alert("포인트가 부족합니다!");
                         return;
                       }
                       setSelectedGifticon(item);
                       setPhoneNumber("");
                       setShowPhoneModal(true);
                     }}`;

content = content.replace(oldButton, newButton);

// We need to update the purchaseGifticon call signature in MyPage.tsx 
// Oh wait, the purchase logic is now moved to the modal.

const modalJSX = `
      <AnimatePresence>
        {showPhoneModal && selectedGifticon && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90" onClick={() => !isPurchasing && setShowPhoneModal(false)} />
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 p-8">
               <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                   {selectedGifticon.image}
                 </div>
                 <h3 className="text-xl font-black text-slate-900 mb-2">{selectedGifticon.name}</h3>
                 <p className="text-sm font-bold text-amber-500">차감 포인트: {selectedGifticon.price.toLocaleString()}P</p>
               </div>
               
               <div className="mb-6">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">알림톡을 받을 연락처</label>
                 <input
                   type="tel"
                   value={phoneNumber}
                   onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                   placeholder="01012345678 (숫자만 입력)"
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 font-bold focus:border-amber-500 transition-all outline-none text-slate-900"
                   maxLength={11}
                 />
                 <p className="text-[10px] font-bold text-slate-400 mt-2">입력하신 번호로 기프티콘 알림톡이 발송됩니다. 정확히 확인해 주세요!</p>
               </div>
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setShowPhoneModal(false)}
                   disabled={isPurchasing}
                   className="flex-1 py-4 bg-slate-50 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-50"
                 >
                   취소
                 </button>
                 <button 
                   onClick={async () => {
                     if (phoneNumber.length < 10) {
                       alert("올바른 연락처를 입력해 주세요.");
                       return;
                     }
                     setIsPurchasing(true);
                     const userId = localStorage.getItem("gongsil_user_id");
                     if (!userId) {
                       setIsPurchasing(false);
                       return;
                     }
                     const res = await purchaseGifticon(userId, selectedGifticon.id, selectedGifticon.name, selectedGifticon.price, phoneNumber);
                     alert(res.message);
                     if (res.success) {
                       const newReqs = await fetchGifticonRequests(userId);
                       setGifticonRequests(newReqs);
                       setShowPhoneModal(false);
                     }
                     setIsPurchasing(false);
                   }}
                   disabled={isPurchasing || phoneNumber.length < 10}
                   className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                 >
                   {isPurchasing ? "발송 중..." : "기프티콘 받기"}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

content = content.replace(/    <\/div>\n  \);\n}/, modalJSX);

fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('Modified src/components/MyPage.tsx');
