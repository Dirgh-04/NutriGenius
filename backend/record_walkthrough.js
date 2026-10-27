/**
 * NutriGenius — Automated Screen Recording Generator
 * Records an authentic, high-resolution interactive screen walkthrough of NutriGenius.
 */

const puppeteer = require('puppeteer-core');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');

const OUTPUT_VIDEO = path.join(__dirname, '../NutriGenius_Walkthrough.mp4');
const FPS = 15;
const WIDTH = 1280;
const HEIGHT = 720;

// Cursor and UI overlay styles injected into the page
const INJECT_SCRIPT = `
(function() {
  if (document.getElementById('recording-cursor')) return;

  const cursor = document.createElement('div');
  cursor.id = 'recording-cursor';
  cursor.innerHTML = \`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
      <path d="M4 3L11 20L14 13L21 10L4 3Z" fill="#1e293b" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    <div id="cursor-click-ring"></div>
  \`;
  cursor.style.cssText = 'position:fixed; top:0; left:0; z-index:999999; pointer-events:none; transition: transform 0.08s ease-out;';

  const ring = cursor.querySelector('#cursor-click-ring');
  ring.style.cssText = 'position:absolute; top:-12px; left:-12px; width:44px; height:44px; border-radius:50%; border:3px solid rgba(5,150,105,0.8); opacity:0; pointer-events:none;';

  document.body.appendChild(cursor);

  window.moveVirtualCursor = function(x, y) {
    cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };

  window.pulseClick = function() {
    ring.style.transition = 'none';
    ring.style.transform = 'scale(0.2)';
    ring.style.opacity = '1';
    requestAnimationFrame(() => {
      ring.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
      ring.style.transform = 'scale(1.4)';
      ring.style.opacity = '0';
    });
  };
})();
`;

async function main() {
  console.log('=====================================================');
  console.log(' Starting NutriGenius Screen Recording Generator...');
  console.log(' Output target:', OUTPUT_VIDEO);
  console.log('=====================================================');

  // Spawn FFmpeg to stream H.264 video
  const ffmpeg = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUTPUT_VIDEO
  ]);

  ffmpeg.stderr.on('data', () => {}); // silence ffmpeg verbose output

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${WIDTH},${HEIGHT}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Helper to capture frames
  let curX = 640;
  let curY = 360;

  async function captureFrames(count = 1) {
    for (let i = 0; i < count; i++) {
      const buffer = await page.screenshot({ type: 'png' });
      ffmpeg.stdin.write(buffer);
    }
  }

  async function moveTo(targetX, targetY, steps = 8) {
    const startX = curX;
    const startY = curY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Smooth cubic easing
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      curX = Math.round(startX + (targetX - startX) * ease);
      curY = Math.round(startY + (targetY - startY) * ease);
      await page.evaluate((x, y) => window.moveVirtualCursor(x, y), curX, curY);
      await captureFrames(1);
    }
  }

  async function clickAt(targetX, targetY) {
    await moveTo(targetX, targetY);
    await page.evaluate(() => window.pulseClick());
    await captureFrames(3);
  }

  async function smoothScroll(distance, steps = 10) {
    const perStep = distance / steps;
    for (let i = 0; i < steps; i++) {
      await page.evaluate((d) => window.scrollBy(0, d), perStep);
      await captureFrames(1);
    }
    await captureFrames(2);
  }

  console.log('[1/8] Opening NutriGenius Dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate(INJECT_SCRIPT);
  await moveTo(640, 280);
  await captureFrames(FPS * 1.5); // hold for 1.5s

  console.log('[2/8] Exploring Dashboard & Previewing Nutrition Metrics...');
  // Hover over Hero CTA and click Demo Statistics
  await moveTo(480, 240);
  await clickAt(480, 240);
  await page.evaluate(() => window.dashboardController.loadDemoData());
  await captureFrames(FPS * 2); // Show animated Chart.js macro distribution

  // Scroll down to review Dashboard cards
  await smoothScroll(320);
  await captureFrames(FPS * 1.5);
  await smoothScroll(-320);
  await captureFrames(FPS * 1);

  console.log('[3/8] Navigating to Food Analyzer & Looking up Barcode...');
  // Click Food Analyzer tab in header
  await clickAt(330, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('food'));
  await captureFrames(FPS * 1.2);

  // Click sample barcode Nutella (3017620422003)
  await moveTo(260, 215);
  await clickAt(260, 215);
  await page.evaluate(() => {
    document.getElementById('foodBarcodeInput').value = '3017620422003';
    window.foodController.searchBarcode('3017620422003');
  });
  await captureFrames(FPS * 3); // view loaded product & Nutri-Score E

  // Interacting with Portion Scaling Calculator
  await smoothScroll(180);
  await moveTo(970, 310);
  await clickAt(970, 310);
  await page.evaluate(() => {
    document.getElementById('portionInput').value = '50';
    window.foodController.applyPortion();
  });
  await captureFrames(FPS * 2); // watch nutrients scale to 50g

  // Click "+ Log to Tracker"
  await clickAt(1150, 220);
  await page.evaluate(() => window.foodController.logCurrentFood());
  await captureFrames(FPS * 1.5);

  console.log('[4/8] Demonstrating Side-by-Side Product Comparison...');
  // Navigate to Comparison
  await clickAt(450, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('comparison'));
  await captureFrames(FPS * 1);

  // Load Product A (Nutella) and Product B (Coca Cola)
  await page.evaluate(() => {
    window.comparisonController.loadBarcode('A', '3017620422003');
    window.comparisonController.loadBarcode('B', '5449000000996');
  });
  await captureFrames(FPS * 2.5);

  // Switch priority to 'Lower Sugar'
  await moveTo(480, 110);
  await clickAt(480, 110);
  await page.evaluate(() => window.comparisonController.setPriority('low_sugar'));
  await captureFrames(FPS * 1.5);

  // Switch priority to 'High Protein'
  await moveTo(600, 110);
  await clickAt(600, 110);
  await page.evaluate(() => window.comparisonController.setPriority('high_protein'));
  await captureFrames(FPS * 2);

  console.log('[5/8] Exploring Culinary Recipe Finder...');
  // Navigate to Recipes
  await clickAt(550, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('recipes'));
  await captureFrames(FPS * 1);

  // Search "Chicken"
  await page.evaluate(() => {
    document.getElementById('recipeSearchInput').value = 'Chicken';
    window.recipeController.search('Chicken');
  });
  await captureFrames(FPS * 2.5);

  // Scroll through recipe cards
  await smoothScroll(250);
  await captureFrames(FPS * 1);

  // Open recipe details modal
  await clickAt(300, 340);
  await page.evaluate(() => {
    const firstRecipe = window.recipeController.recipes[0];
    if (firstRecipe) window.recipeController.openRecipeDetails(firstRecipe.id);
  });
  await captureFrames(FPS * 2.5);

  // Close modal
  await page.evaluate(() => {
    const modal = document.getElementById('recipeModal');
    if (modal) modal.style.display = 'none';
  });
  await captureFrames(FPS * 0.8);

  console.log('[6/8] Investigating Raw Fruit Nutrition & Taxonomy...');
  // Navigate to Fruits
  await clickAt(640, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('fruits'));
  await captureFrames(FPS * 1);

  // Click Banana
  await page.evaluate(() => window.fruitController.search('Banana'));
  await captureFrames(FPS * 2);

  // Log Banana
  await page.evaluate(() => window.fruitController.logFruit());
  await captureFrames(FPS * 1);

  // Click Strawberry
  await page.evaluate(() => window.fruitController.search('Strawberry'));
  await captureFrames(FPS * 2);

  console.log('[7/8] Reviewing Nutrition Tracker & Food Journal...');
  // Navigate to Tracker
  await clickAt(720, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('nutrition'));
  await captureFrames(FPS * 2);

  // Fill in manual food entry
  await page.evaluate(() => {
    document.getElementById('manualFoodName').value = 'Salmon with Quinoa';
    document.getElementById('manualCalories').value = '420';
    document.getElementById('manualProtein').value = '36';
    document.getElementById('manualCarbs').value = '28';
    document.getElementById('manualFat').value = '14';
  });
  await captureFrames(FPS * 1);

  // Submit entry
  await clickAt(1150, 340);
  await page.evaluate(() => {
    window.nutritionTrackerController.addCustomEntry({
      food_name: 'Salmon with Quinoa',
      calories: 420,
      protein: 36,
      carbohydrates: 28,
      fat: 14,
      meal_type: 'dinner'
    });
  });
  await captureFrames(FPS * 2);

  console.log('[8/8] Generating Personalized Daily Meal Plan...');
  // Navigate to Meal Planner
  await clickAt(820, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('mealPlanner'));
  await captureFrames(FPS * 1);

  // Configure preferences & generate plan
  await page.evaluate(() => {
    document.getElementById('plannerDietarySelect').value = 'vegetarian';
    document.getElementById('plannerCalorieGoal').value = '1900';
    document.getElementById('plannerPreferredInput').value = 'spinach, chickpea, rice';
    window.mealPlannerController.generatePlan();
  });
  await captureFrames(FPS * 3.5); // view generated plan

  // Save meal plan
  await moveTo(1100, 240);
  await clickAt(1100, 240);
  await page.evaluate(() => window.mealPlannerController.saveCurrentPlan());
  await captureFrames(FPS * 1.5);

  // Smoothly return to Dashboard
  await clickAt(230, 34);
  await page.evaluate(() => window.nutriGeniusApp.navigate('dashboard'));
  await smoothScroll(-500);
  await captureFrames(FPS * 2);

  console.log('Finalizing video file...');
  ffmpeg.stdin.end();
  await new Promise((resolve) => ffmpeg.on('close', resolve));
  await browser.close();

  console.log('=====================================================');
  console.log(' Walkthrough video created successfully!');
  console.log(' File: ' + OUTPUT_VIDEO);
  console.log('=====================================================');
}

main().catch((err) => {
  console.error('Recording error:', err);
  process.exit(1);
});
