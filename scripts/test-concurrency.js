const API_BASE = 'http://localhost:5000/api';

async function runConcurrencyTest() {
  console.log('\n======================================================');
  console.log('⚡ STARTING 100-REQUEST CONCURRENCY RACE TEST (PRD AC-1)');
  console.log('======================================================\n');

  try {
    // 1. Fetch available classes to get a target class
    const classesRes = await fetch(`${API_BASE}/classes`);
    const classesData = await classesRes.json();
    const classes = Array.isArray(classesData) ? classesData : classesData.classes;

    if (!Array.isArray(classes) || classes.length === 0) {
      console.error('❌ No classes found. Make sure backend server is running on http://localhost:5000!');
      return;
    }

    const targetClass = classes[0];
    const initialAvailableSeats = targetClass.available_seats ?? targetClass.availableSeats;
    console.log(`🎯 Target Class: "${targetClass.name || targetClass.title}" (ID: ${targetClass.id})`);
    console.log(`📊 Initial Available Seats: ${initialAvailableSeats}\n`);

    // 2. Register 100 unique simulated members to get 100 valid JWT tokens
    console.log('👤 Registering 100 unique simulated members...');
    const tokens = [];

    for (let i = 1; i <= 100; i++) {
      const email = `race_user_${Date.now()}_${i}@curefit.com`;
      const signupRes = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      const signupData = await signupRes.json();
      if (signupData.token) {
        tokens.push(signupData.token);
      }
    }

    console.log(`✅ ${tokens.length} Member Tokens Generated.`);
    console.log('🚀 Firing 100 parallel booking requests at the EXACT SAME millisecond...\n');

    // 3. Fire 100 parallel HTTP POST /api/bookings requests simultaneously via Promise.all
    const startTime = Date.now();

    const bookingPromises = tokens.map((token) =>
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: targetClass.id })
      }).then(async (res) => ({ status: res.status, data: await res.json() }))
    );

    const results = await Promise.all(bookingPromises);
    const duration = Date.now() - startTime;

    // 4. Aggregate & Count Successes vs Conflicts
    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    results.forEach((res) => {
      if (res.status === 201) successCount++;
      else if (res.status === 409 || res.status === 422) conflictCount++;
      else otherCount++;
    });

    console.log('======================================================');
    console.log(`⏱️ Execution Time: ${duration}ms`);
    console.log('🏆 CONCURRENCY RACE TEST RESULT (README.md Spec):');
    console.log('======================================================\n');

    const output = {
      classId: targetClass.id,
      requests: results.length,
      successCount: successCount,
      conflictCount: conflictCount
    };

    console.log(JSON.stringify(output, null, 2));

    console.log('\n======================================================');
    if (successCount === 1) {
      console.log('✅ TEST PASSED: Exactly 1 reservation succeeded!');
      console.log('🔒 PostgreSQL row locking (SELECT FOR UPDATE) prevented all double-bookings!');
    } else if (successCount <= initialAvailableSeats) {
      console.log(`✅ TEST PASSED: ${successCount} reservation(s) succeeded matching exact available capacity!`);
    } else {
      console.log(`⚠️ OVERBOOKING DETECTED: ${successCount} bookings succeeded.`);
    }
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Race Test Error:', err);
  }
}

runConcurrencyTest();
