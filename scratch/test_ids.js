
const { generateSpaceId } = require('../src/lib/db');

async function test() {
    console.log('--- Space ID Generation Test ---');
    console.log('Seoul, Seodaemun-gu, Chunghyeon-dong (01?):', generateSpaceId("서울", "서대문구", "충현동", 1));
    console.log('Busan, Haeundae-gu, U-dong:', generateSpaceId("부산", "해운대구", "우동", 5));
    console.log('Unknown Region:', generateSpaceId("판타지", "마을", "신비동", 1));
}

test();
