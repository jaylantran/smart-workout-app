const apiKey = 'Q+IVxLBMb7ZgWDd4Nsfarw==WnFqITuIFSuPskI2';

// Global state variables for timer
let workoutPlan = [];
let currentExerciseIndex = 0;
let currentTimerState = 'WORK';
let workDuration = 30;
let restDuration = 10;
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

// Helper function to get all selected options from a multi-select box
function getSelectedOptions(selectElement) {
    const selectedValues = [];
    for (let option of selectElement.options) {
        if (option.selected) {
            selectedValues.push(option.value);
        }
    }
    return selectedValues;
}

// Add click event listener to generate button
generateBtn.addEventListener('click', async function() {
    try {
        // Get timer values from input fields
        workDuration = parseInt(document.getElementById('work-time').value);
        restDuration = parseInt(document.getElementById('rest-time').value);
        
        // Get selected values from multi-select dropdowns
        const selectedMuscles = getSelectedOptions(muscleGroupSelect);
        const selectedEquipment = getSelectedOptions(equipmentSelect);
        const numExercises = parseInt(document.getElementById('num-exercises').value);
        
        // Check if user selected at least one muscle group
        if (selectedMuscles.length === 0) {
            alert('Please select at least one muscle group.');
            return;
        }
        
        // Step 1: Get all inputs (already done above)
        
        // Step 2: Fetch a large pool of exercises from all selected muscle groups
        let allExercises = [];
        
        for (let muscle of selectedMuscles) {
            const response = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`, {
                headers: {
                    'X-Api-Key': apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const exercises = await response.json();
            
            // Add muscle group information to each exercise
            const exercisesWithMuscle = exercises.map(exercise => ({
                ...exercise,
                muscleGroup: muscle
            }));
            
            allExercises = allExercises.concat(exercisesWithMuscle);
        }
        
        // Step 3: Filter the pool based on equipment selection
        let validExercises = [];
        
        if (selectedEquipment.length === 0) {
            // If no equipment selected, include all exercises
            validExercises = allExercises;
        } else if (selectedEquipment.includes('none')) {
            // If 'none' is selected, filter for 'body_only' exercises
            validExercises = allExercises.filter(exercise => exercise.equipment === 'body_only');
        } else {
            // Filter for exercises that match any of the selected equipment types
            validExercises = allExercises.filter(exercise => 
                selectedEquipment.includes(exercise.equipment)
            );
        }
        
        // Implement fallback: if no exercises found, get body_only exercises
        if (validExercises.length === 0) {
            console.log('No exercises found with selected equipment. Falling back to body_only exercises.');
            
            for (let muscle of selectedMuscles) {
                const fallbackResponse = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`, {
                    headers: {
                        'X-Api-Key': apiKey
                    }
                });
                
                if (fallbackResponse.ok) {
                    const fallbackExercises = await fallbackResponse.json();
                    const bodyOnlyExercises = fallbackExercises
                        .filter(exercise => exercise.equipment === 'body_only')
                        .map(exercise => ({ ...exercise, muscleGroup: muscle }));
                    validExercises = validExercises.concat(bodyOnlyExercises);
                }
            }
        }
        
        // Step 4: Intelligent Selection
        let finalWorkoutPlan = [];
        
        // Step 4a: Create empty finalWorkoutPlan array (already done)
        
        // Step 4b: Group validExercises by muscle group
        const exercisesByMuscle = {};
        validExercises.forEach(exercise => {
            if (!exercisesByMuscle[exercise.muscleGroup]) {
                exercisesByMuscle[exercise.muscleGroup] = [];
            }
            exercisesByMuscle[exercise.muscleGroup].push(exercise);
        });
        
        // Step 4c: Guaranteed Representation Loop
        const muscleGroups = Object.keys(exercisesByMuscle);
        for (let muscleGroup of muscleGroups) {
            if (finalWorkoutPlan.length >= numExercises) break;
            
            const exercisesForMuscle = exercisesByMuscle[muscleGroup];
            if (exercisesForMuscle.length > 0) {
                // Pick one random exercise from this muscle group
                const randomIndex = Math.floor(Math.random() * exercisesForMuscle.length);
                const selectedExercise = exercisesForMuscle[randomIndex];
                finalWorkoutPlan.push(selectedExercise);
                
                // Remove this exercise from the validExercises pool
                const exerciseIndex = validExercises.findIndex(ex => ex.name === selectedExercise.name);
                if (exerciseIndex > -1) {
                    validExercises.splice(exerciseIndex, 1);
                }
            }
        }
        
        // Step 4d: Filler Loop
        while (finalWorkoutPlan.length < numExercises && validExercises.length > 0) {
            const randomIndex = Math.floor(Math.random() * validExercises.length);
            const selectedExercise = validExercises[randomIndex];
            finalWorkoutPlan.push(selectedExercise);
            
            // Remove this exercise from the pool
            validExercises.splice(randomIndex, 1);
        }
        
        // Step 5: Finalize
        const shuffledFinalWorkoutPlan = shuffleArray(finalWorkoutPlan);
        
        // Check if we couldn't meet the user's request
        if (shuffledFinalWorkoutPlan.length < numExercises) {
            alert(`Could only find ${shuffledFinalWorkoutPlan.length} unique exercises. Your workout will be shorter than requested.`);
        }
        
        // Store the final workout plan in global workoutPlan
        workoutPlan = shuffledFinalWorkoutPlan;
        
        // Display the workout
        displayWorkout(shuffledFinalWorkoutPlan);
        
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
    timeLeft = workDuration;
    
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
            timeLeft = restDuration;
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
            timeLeft = workDuration;
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



