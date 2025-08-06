const apiKey = 'Q+IVxLBMb7ZgWDd4Nsfarw==WnFqITuIFSuPskI2';

// Global state variables for timer
let workoutPlan = [];
let currentExerciseIndex = 0;
let currentTimerState = 'WORK';
let timeLeft = 30;
let timerInterval = null;

// Get DOM element references
const setupScreen = document.getElementById('setup-screen');
const workoutScreen = document.getElementById('workout-screen');
const generateBtn = document.getElementById('generate-btn');
const muscleGroupSelect = document.getElementById('muscle-group');
const equipmentSelect = document.getElementById('equipment');
const workoutList = document.getElementById('workout-list');

// Timer DOM references
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const currentExerciseName = document.getElementById('current-exercise-name');

// Add click event listener to generate button
generateBtn.addEventListener('click', async function() {
    try {
        // Get selected values from dropdowns
        const selectedMuscle = muscleGroupSelect.value;
        const selectedEquipment = equipmentSelect.value;
        
        // Call the API-Ninjas exercises API
        const response = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${selectedMuscle}`, {
            headers: {
                'X-Api-Key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const exercises = await response.json();
        
        // Filter exercises based on equipment selection
        let filteredExercises = exercises;
        if (selectedEquipment === 'none') {
            // If user selected 'none', filter for 'body_only' exercises
            filteredExercises = exercises.filter(exercise => exercise.equipment === 'body_only');
        } else {
            // Filter for exercises that match the selected equipment
            filteredExercises = exercises.filter(exercise => exercise.equipment === selectedEquipment);
        }
        
        // Shuffle and select first 5 exercises
        const shuffledExercises = shuffleArray(filteredExercises);
        const selectedExercises = shuffledExercises.slice(0, 5);
        
        // Store the selected exercises in global workoutPlan
        workoutPlan = selectedExercises;
        
        // Display the workout
        displayWorkout(selectedExercises);
        
        // Setup the workout UI
        setupWorkoutUI();
        
        // Hide setup screen and show workout screen
        setupScreen.style.display = 'none';
        workoutScreen.style.display = 'block';
        
    } catch (error) {
        alert(`Error generating workout: ${error.message}`);
        console.error('Error:', error);
    }
});

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to display the workout in the workout list
function displayWorkout(exercises) {
    // Clear the existing workout list
    workoutList.innerHTML = '';
    
    // Add each exercise to the list
    exercises.forEach(exercise => {
        const listItem = document.createElement('li');
        listItem.textContent = exercise.name;
        workoutList.appendChild(listItem);
    });
}

// Function to setup the workout UI
function setupWorkoutUI() {
    currentExerciseIndex = 0;
    currentTimerState = 'WORK';
    timeLeft = 30;
    
    // Set the first exercise name
    currentExerciseName.textContent = workoutPlan[0].name;
    
    // Reset timer display
    timerDisplay.textContent = formatTime(timeLeft);
    
    // Set timer status
    timerStatus.textContent = 'WORK';
}

// Function to format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to update the timer
function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = formatTime(timeLeft);
    
    if (timeLeft < 0) {
        if (currentTimerState === 'WORK') {
            // Switch to REST
            currentTimerState = 'REST';
            timeLeft = 10;
            timerStatus.textContent = 'REST';
        } else if (currentTimerState === 'REST') {
            // Move to next exercise
            currentExerciseIndex++;
            
            if (currentExerciseIndex >= workoutPlan.length) {
                // Workout complete
                clearInterval(timerInterval);
                timerInterval = null;
                currentExerciseName.textContent = 'Workout Complete!';
                timerStatus.textContent = 'FINISHED';
                return;
            }
            
            // Switch back to WORK for next exercise
            currentTimerState = 'WORK';
            timeLeft = 30;
            timerStatus.textContent = 'WORK';
            currentExerciseName.textContent = workoutPlan[currentExerciseIndex].name;
        }
    }
}

// Add button event listeners
startBtn.addEventListener('click', function() {
    if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }
});

pauseBtn.addEventListener('click', function() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
});

resetBtn.addEventListener('click', function() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset to setup screen
    workoutScreen.style.display = 'none';
    setupScreen.style.display = 'block';
});
