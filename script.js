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
const videoContainer = document.getElementById('video-container');

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
        
        // Check if user selected at least one muscle group
        if (selectedMuscles.length === 0) {
            alert('Please select at least one muscle group.');
            return;
        }
        
        // Fetch exercises for each muscle with fallback logic
        let allExercises = [];
        
        for (let muscle of selectedMuscles) {
            // Initial API call for the muscle
            const response = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`, {
                headers: {
                    'X-Api-Key': apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const exercises = await response.json();
            
            // Filter exercises based on equipment selection
            let filteredExercisesForMuscle = [];
            
            if (selectedEquipment.length === 0) {
                // If no equipment selected, include all exercises
                filteredExercisesForMuscle = exercises;
            } else if (selectedEquipment.includes('none')) {
                // If 'none' is selected, filter for 'body_only' exercises
                filteredExercisesForMuscle = exercises.filter(exercise => exercise.equipment === 'body_only');
            } else {
                // Filter for exercises that match any of the selected equipment types
                filteredExercisesForMuscle = exercises.filter(exercise => 
                    selectedEquipment.includes(exercise.equipment)
                );
            }
            
            // Check if the filtered list is empty - if so, perform fallback search
            if (filteredExercisesForMuscle.length === 0) {
                console.log(`No exercises found for ${muscle} with selected equipment. Falling back to body_only exercises.`);
                
                // Fallback: search for body_only exercises for this muscle
                const fallbackResponse = await fetch(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`, {
                    headers: {
                        'X-Api-Key': apiKey
                    }
                });
                
                if (fallbackResponse.ok) {
                    const fallbackExercises = await fallbackResponse.json();
                    // Filter for body_only exercises as fallback
                    filteredExercisesForMuscle = fallbackExercises.filter(exercise => exercise.equipment === 'body_only');
                }
            }
            
            // Add the exercises for this muscle to our combined list
            allExercises = allExercises.concat(filteredExercisesForMuscle);
        }
        
        // Use the combined and filtered exercises
        let filteredExercises = allExercises;
        
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
    timeLeft = workDuration;
    
    // Set the first exercise name
    currentExerciseName.textContent = workoutPlan[0].name;
    
    // Display video for the first exercise
    displayExerciseVideo(workoutPlan[0].name);
    
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
            
            // Display video for the new exercise
            displayExerciseVideo(workoutPlan[currentExerciseIndex].name);
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

// Function to display YouTube video for the current exercise
function displayExerciseVideo(exerciseName) {
    // Clear the video container's current content
    videoContainer.innerHTML = '';
    
    // Simplify the exercise name for better YouTube search results
    let simpleName = exerciseName.toLowerCase();
    // Remove common equipment words
    simpleName = simpleName.replace(/\b(dumbbell|barbell|kettlebell|bodyweight)\b/g, '');
    // Clean up extra spaces
    simpleName = simpleName.replace(/\s+/g, ' ').trim();
    
    // Create YouTube embed URL with the simplified name
    const encodedExerciseName = encodeURIComponent(simpleName);
    const youtubeUrl = `https://www.youtube.com/embed?listType=search&list=${encodedExerciseName}`;
    
    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = youtubeUrl;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.allowFullscreen = true;
    iframe.title = `${exerciseName} demonstration`;
    
    // Append the iframe to the video container
    videoContainer.appendChild(iframe);
}
