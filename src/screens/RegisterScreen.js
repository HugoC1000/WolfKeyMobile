import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { useUser } from '../context/userContext';
import BackgroundSvg from '../components/BackgroundSVG';
import CourseSelector from '../components/CourseSelector';
import ScheduleTab from '../components/ScheduleTab';
import { scheduleService } from '../api/scheduleService';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const { loadUser } = useUser();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [stepProgress] = useState(new Animated.Value(1));
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    school_email: '',
    personal_email: '',
    password: '',
    confirm_password: '',
    wolfnet_password: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const [experiencedCourses, setExperiencedCourses] = useState([]);
  const [helpNeededCourses, setHelpNeededCourses] = useState([]);
  
  const [wolfnetSkipped, setWolfnetSkipped] = useState(false);
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);
  const [autoCompleteResult, setAutoCompleteResult] = useState(null);
  const [autoCompleteError, setAutoCompleteError] = useState(null);
  const [autoCompleteErrorType, setAutoCompleteErrorType] = useState(null);
  const [wolfnetErrorSkipped, setWolfnetErrorSkipped] = useState(false);
  const [shouldExcludeWolfnetPassword, setShouldExcludeWolfnetPassword] = useState(false);
  
  const [savedExperiencedCourses, setSavedExperiencedCourses] = useState([]);
  const [savedHelpNeededCourses, setSavedHelpNeededCourses] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showWolfnetPassword, setShowWolfnetPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        break;
      case 2:
        if (!formData.school_email.trim()) {
          newErrors.school_email = 'School email is required';
        } else if (!formData.school_email.endsWith('@wpga.ca')) {
          newErrors.school_email = 'Please use your @wpga.ca email address';
        }
        break;
      case 3:
        if (!formData.password || formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (!formData.confirm_password) {
          newErrors.confirm_password = 'Please confirm your password';
        } else if (formData.password !== formData.confirm_password) {
          newErrors.confirm_password = 'Passwords do not match';
        }
        break;
      case 5:
        if (experiencedCourses.length < 3) {
          newErrors.experienced = 'Please select at least 3 courses you can help with';
        }
        if (helpNeededCourses.length < 3) {
          newErrors.help = 'Please select at least 3 courses you need help with';
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const transitionToStep = (nextStep) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: nextStep > currentStep ? 50 : -50,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      
      // Reset wolfnetSkipped if going back to step 3 (password step)
      if (nextStep === 3) {
        setWolfnetSkipped(false);
      }
      
      // Reset WolfNet error states when going back to WolfNet step (step 4)
      if (nextStep === 4) {
        setAutoCompleteError(null);
        setAutoCompleteErrorType(null);
        setShouldExcludeWolfnetPassword(false);
      }
      
      // Save course selections when going back to WolfNet step (step 4) from courses (step 5)
      if (nextStep === 4 && currentStep === 5) {
        setSavedExperiencedCourses(experiencedCourses);
        setSavedHelpNeededCourses(helpNeededCourses);
      }
      
      // Restore course selections when coming back to courses step (step 5) from WolfNet
      if (nextStep === 5 && currentStep === 4 && (savedExperiencedCourses.length > 0 || savedHelpNeededCourses.length > 0)) {
        setExperiencedCourses(savedExperiencedCourses);
        setHelpNeededCourses(savedHelpNeededCourses);
      }
      
      // Animate progress bar
      Animated.timing(stepProgress, {
        toValue: nextStep,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      // Slide in new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        // Coming from WolfNet step
        if (wolfnetSkipped) {
          transitionToStep(5); // Go to courses step
        } else {
          // WolfNet password entered, will start background loading
          transitionToStep(5); // Go to courses step
        }
      } else if (currentStep === 5) {
        // Coming from courses step
        if (autoCompleteResult || autoCompleteLoading || autoCompleteError) {
          transitionToStep(6); 
        } else if (wolfnetSkipped) {
          handleSubmit(); // Skip to submission if error or skipped
        } else {
          handleSubmit(); // No auto-complete attempted
        }
      } else if (currentStep === 6) {
        handleSubmit(); // Submit from schedule step
      } else {
        transitionToStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Save course selections when going back from courses step (step 5)
      if (currentStep === 5) {
        setSavedExperiencedCourses(experiencedCourses);
        setSavedHelpNeededCourses(helpNeededCourses);
      }
      
      if (currentStep === 5 && wolfnetSkipped) {
        transitionToStep(3); // Skip WolfNet step if it was skipped
      } else if (currentStep === 6 && autoCompleteError) {
        transitionToStep(4); // Go back to WolfNet step if there was an error
      } else {
        transitionToStep(currentStep - 1);
      }
    }
  };

  // WolfNet integration
  const handleWolfnetSkip = () => {
    setWolfnetSkipped(true);
    transitionToStep(5);
  };

  const handleWolfnetErrorSkip = () => {
    setWolfnetErrorSkipped(true);
    handleSubmit();
  };

  const handleAutoComplete = async () => {
    if (!formData.wolfnet_password.trim()) {
      Alert.alert('Error', 'Please enter your WolfNet password first');
      return;
    }
    
    if (!formData.school_email.trim() || !formData.school_email.endsWith('@wpga.ca')) {
      Alert.alert('Error', 'Please enter a valid school email first');
      return;
    }
    
    setAutoCompleteLoading(true);
    setAutoCompleteError(null);
    
    // Start loading in background and move to courses step
    transitionToStep(5);
    
    try {
      // Auto-complete courses with password during registration
      const result = await scheduleService.autoCompleteCoursesWithPassword(
        formData.wolfnet_password, 
        formData.school_email
      );
      setAutoCompleteResult(result);
    } catch (error) {
      console.error('Auto-complete error:', error);
      
      // Parse the error response to get error type and appropriate message
      let displayMessage = 'Failed to connect to WolfNet';
      let errorType = 'general';
      
      // Check if the error has response data with detailed error info
      if (error.response?.data) {
        const errorData = error.response.data;
        errorType = errorData.error_type || 'general';
        
        switch (errorType) {
          case 'authentication':
            displayMessage = 'WolfNet Authentication failed. Password incorrect.';
            setShouldExcludeWolfnetPassword(true); // Don't submit wrong password
            break;
          case 'page_loading':
            displayMessage = 'WolfNet page failed to load properly. This may be a temporary issue - you can try again later or continue without auto-completing your schedule.';
            break;
          case 'page_structure':
            displayMessage = 'Unable to find course information on WolfNet page. You can continue without auto-completing your schedule.';
            break;
          case 'no_courses':
            displayMessage = 'No courses found in your WolfNet schedule. Make sure you have courses enrolled. Continue without auto-completing your schedule.';
            break;
          case 'network':
            displayMessage = 'Network error occurred while connecting to WolfNet. Please check your connection and try again, or continue without auto-completing your schedule.';
            break;
          default:
            displayMessage = errorData.error || error.message || 'An unexpected error occurred while retrieving your schedule.';
        }
      } else {
        displayMessage = error.message || 'Failed to connect to WolfNet';
      }
      
      setAutoCompleteError(displayMessage);
      setAutoCompleteErrorType(errorType);
    } finally {
      setAutoCompleteLoading(false);
    }
  };

  // Course selection handlers
  const handleExperiencedCoursesChange = (courses) => {
    setExperiencedCourses(courses);
    if (errors.experienced) {
      setErrors(prev => ({ ...prev, experienced: null }));
    }
  };

  const handleHelpNeededCoursesChange = (courses) => {
    setHelpNeededCourses(courses);
    if (errors.help) {
      setErrors(prev => ({ ...prev, help: null }));
    }
  };

  // Add courses from schedule tab
  const handleAddExperience = (courseId) => {
    // This would be called from ScheduleTab when user clicks "Proficient"
    // We need to find the course in autoCompleteResult and add it to experiencedCourses
    if (autoCompleteResult && autoCompleteResult.schedule_courses) {
      const course = Object.values(autoCompleteResult.schedule_courses)
        .find(c => c && c.id === courseId);
      if (course && !experiencedCourses.find(c => c.id === courseId)) {
        setExperiencedCourses(prev => [...prev, course]);
      }
    }
  };

  const handleAddHelp = (courseId) => {
    // This would be called from ScheduleTab when user clicks "Need Help"
    if (autoCompleteResult && autoCompleteResult.schedule_courses) {
      const course = Object.values(autoCompleteResult.schedule_courses)
        .find(c => c && c.id === courseId);
      if (course && !helpNeededCourses.find(c => c.id === courseId)) {
        setHelpNeededCourses(prev => [...prev, course]);
      }
    }
  };

  // Final submission
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      const registrationData = {
        ...formData,
        password1: formData.password,
        password2: formData.confirm_password,
        experienced_courses: experiencedCourses.map(c => c.id),
        help_needed_courses: helpNeededCourses.map(c => c.id),
      };
      
      // Remove the original password fields as we're using password1/password2
      delete registrationData.password;
      delete registrationData.confirm_password;
      
      if (wolfnetSkipped) {
        delete registrationData.wolfnet_password;
      }
      
      // Also remove wolfnet password if user skipped due to error
      if (wolfnetErrorSkipped) {
        delete registrationData.wolfnet_password;
      }
      
      // Remove wolfnet password if there was an authentication error (wrong password)
      if (shouldExcludeWolfnetPassword) {
        delete registrationData.wolfnet_password;
      }
      
      await register(registrationData, loadUser);
      
      Alert.alert(
        'Welcome to WolfKey!',
        'Your account has been created successfully.',
        [{ text: 'OK', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message && error.message.includes('Email:')) {
        if (error.message.includes('already registered')) {
          setErrors(prev => ({ 
            ...prev, 
            school_email: 'This email is already registered. Please use a different email or try logging in.' 
          }));
          if (currentStep > 2) {
            transitionToStep(2);
          }
        } else {
          Alert.alert('Registration Failed', error.message);
        }
      } else {
        Alert.alert('Registration Failed', error.message || 'Please try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress indicator
  const renderProgressIndicator = () => {
    const totalSteps = wolfnetSkipped ? 5 : (autoCompleteResult || autoCompleteLoading? 6 : 5);
    const progress = stepProgress.interpolate({
      inputRange: [1, totalSteps],
      outputRange: ['16%', '100%'],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progress }]} />
        </View>
        <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
      </View>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    const transform = [{
      translateX: slideAnim,
    }];

    return (
      <Animated.View style={[
        styles.stepContent,
        { opacity: fadeAnim, transform }
      ]}>
        {currentStep === 1 && renderPersonalInfoStep()}
        {currentStep === 2 && renderEmailStep()}
        {currentStep === 3 && renderPasswordStep()}
        {currentStep === 4 && renderWolfnetStep()}
        {currentStep === 5 && renderCoursesStep()}
        {currentStep === 6 && renderScheduleStep()}
      </Animated.View>
    );
  };

  // Step 1: Personal Information (First Name, Last Name)
  const renderPersonalInfoStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="person" size={36} color="#2563eb" />
        <Text style={styles.stepTitle}>What's your name?</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.first_name && styles.inputError]}
          value={formData.first_name}
          onChangeText={(value) => handleInputChange('first_name', value)}
          placeholder="Enter your first name"
          autoCapitalize="words"
          autoFocus
        />
        {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Last Name *</Text>
        <TextInput
          style={[styles.input, errors.last_name && styles.inputError]}
          value={formData.last_name}
          onChangeText={(value) => handleInputChange('last_name', value)}
          placeholder="Enter your last name"
          autoCapitalize="words"
        />
        {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
      </View>
    </View>
  );

  // Step 2: Email Information
  const renderEmailStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="email" size={36} color="#2563eb" />
        <Text style={styles.stepTitle}>Email Addresses</Text>
        <Text style={styles.stepSubtitle}>We need your school email to verify you're a WPGA student</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>School Email *</Text>
        <TextInput
          style={[styles.input, errors.school_email && styles.inputError]}
          value={formData.school_email}
          onChangeText={(value) => handleInputChange('school_email', value)}
          placeholder="yourname@wpga.ca"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {errors.school_email && <Text style={styles.errorText}>{errors.school_email}</Text>}
        <Text style={styles.helperText}>Must be your @wpga.ca email address</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Personal Email (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.personal_email}
          onChangeText={(value) => handleInputChange('personal_email', value)}
          placeholder="personal@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helperText}>NOTE: You can not reset your password without this</Text>
      </View>
    </View>
  );

  // Step 3: Password
  const renderPasswordStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="lock" size={36} color="#2563eb" />
        <Text style={styles.stepTitle}>Create Password</Text>
        <Text style={styles.stepSubtitle}>Choose a secure password for your account</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password *</Text>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          placeholder="At least 6 characters"
          secureTextEntry
          autoFocus
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        <Text style={styles.helperText}>Make it strong! Include letters, numbers, and symbols</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password *</Text>
        <TextInput
          style={[styles.input, errors.confirm_password && styles.inputError]}
          value={formData.confirm_password}
          onChangeText={(value) => handleInputChange('confirm_password', value)}
          placeholder="Confirm your password"
          secureTextEntry
        />
        {errors.confirm_password && <Text style={styles.errorText}>{errors.confirm_password}</Text>}
      </View>

      <View style={styles.infoCard}>
        <MaterialIcons name="security" size={24} color="#059669" />
        <View style={styles.infoCardContent}>
          <Text style={styles.infoCardTitle}>Keep your account safe</Text>
          <Text style={styles.infoCardText}>
            • Use at least 6 characters{'\n'}
            • Mix letters, numbers, and symbols{'\n'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Step 4: WolfNet Integration
  const renderWolfnetStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="school" size={36} color="#3f12dfff" />
        <Text style={styles.stepTitle}>WolfNet Integration</Text>
      </View>

      <View style={styles.infoCard}>
        <MaterialIcons name="info" size={24} color="#2563eb" />
        <View style={styles.infoCardContent}>
          <Text style={styles.infoCardTitle}>Why connect WolfNet?</Text>
          <Text style={styles.infoCardText}>
            • Auto-import your schedule{'\n'}
            • Receive grade notifications{'\n'}
            • Securely encrypted{'\n'}
          </Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WolfNet Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={formData.wolfnet_password}
            onChangeText={(value) => handleInputChange('wolfnet_password', value)}
            placeholder="Enter your WolfNet password"
            secureTextEntry={!showWolfnetPassword}
            autoFocus
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowWolfnetPassword(!showWolfnetPassword)}
          >
            <MaterialIcons
              name={showWolfnetPassword ? "visibility-off" : "visibility"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>
          This is optional but recommended for the best experience
        </Text>
      </View>

      {autoCompleteError && (
        <View style={styles.errorCard}>
          <MaterialIcons name="error" size={24} color="#dc2626" />
          <Text style={styles.errorCardText}>{autoCompleteError}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleWolfnetSkip}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 5: Course Selection
  const renderCoursesStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="book" size={36} color="#059669" />
        <Text style={styles.stepTitle}>Course Experience</Text>
      </View>

      <View style={styles.courseSection}>
        <Text style={styles.courseSectionTitle}>
          Courses you're proficient in (minimum 3)
        </Text>
        <Text style={styles.courseSectionSubtitle}>
          Grades around 90s
        </Text>
        <CourseSelector 
          onCourseSelect={handleExperiencedCoursesChange} 
          selectedCourses={experiencedCourses}
        />
        {errors.experienced && <Text style={styles.errorText}>{errors.experienced}</Text>}
      </View>

      <View style={styles.courseSection}>
        <Text style={styles.courseSectionTitle}>
          Courses you need help with (minimum 3)
        </Text>
        <Text style={styles.courseSectionSubtitle}>
            Not that great grades
        </Text>
        <CourseSelector 
          onCourseSelect={handleHelpNeededCoursesChange} 
          selectedCourses={helpNeededCourses}
        />
        {errors.help && <Text style={styles.errorText}>{errors.help}</Text>}
      </View>
    </View>
  );

  // Step 6: Schedule Review (only if auto-complete succeeded)
  const renderScheduleStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="schedule" size={36} color="#8B5A2B" />
        <Text style={styles.stepTitle}>Your Schedule</Text>
        <Text style={styles.stepSubtitle}>Review your imported schedule</Text>
      </View>

      {autoCompleteError ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={36} color="#dc2626" />
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{autoCompleteError}</Text>
          
          {/* Only show retry button for authentication and network errors */}
          {(autoCompleteErrorType === 'authentication' || autoCompleteErrorType === 'network') && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => transitionToStep(4)}
            >
              <MaterialIcons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.skipErrorButton}
            onPress={handleWolfnetErrorSkip}
          >
            <Text style={styles.skipErrorButtonText}>Continue without WolfNet</Text>
          </TouchableOpacity>
        </View>
      ) : autoCompleteLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5A2B" />
          <Text style={styles.loadingText}>Connecting to WolfNet...</Text>
          <Text style={styles.loadingSubtext}>This may take up to 15 seconds</Text>
        </View>
      ) : (
        <>
          <View style={styles.scheduleContainer}>
            <ScheduleTab
              schedule={autoCompleteResult?.schedule_courses || {}}
              isCurrentUser={true}
              experiencedCourses={experiencedCourses}
              helpNeededCourses={helpNeededCourses}
              onAddExperience={handleAddExperience}
              onAddHelp={handleAddHelp}
              onAutoComplete={() => {}} // Already completed
              autoCompleteLoading={false}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderNavigationButtons = () => (
    <BlurView intensity={30} style={styles.navigationContainer}>
      <View style={styles.navigationContent}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePrevious}
            disabled={isSubmitting}
          >
            <MaterialIcons name="arrow-back" size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.navigationSpacer} />
        
        {((currentStep === 5 && wolfnetSkipped) || 
          (currentStep === 6 && (autoCompleteResult || autoCompleteError))) ? (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="check" size={20} color="white" />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        ) : (currentStep === 4 && !wolfnetSkipped) ? (
          <>
            <TouchableOpacity
              style={[styles.autoCompleteButton, !formData.wolfnet_password.trim() && styles.autoCompleteButtonDisabled]}
              onPress={handleAutoComplete}
              disabled={!formData.wolfnet_password.trim()}
              activeOpacity={1}
            >
              <LinearGradient
                colors={["#294ff8ff", "#8230d5ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.autoCompleteGradient}
              />
              <View style={styles.autoCompleteButtonContent}>
                <MaterialIcons name="auto-fix-high" size={22} style={styles.autoCompleteIcon} />
                <Text style={styles.autoCompleteButtonText}>Connect WolfNet</Text>
              </View>
            </TouchableOpacity>

          </>
        ) : (currentStep === 6 && autoCompleteLoading) ? (
          <TouchableOpacity
            style={[styles.nextButton, styles.buttonDisabled]}
            disabled={true}
          >
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.nextButtonText}>Loading Schedule...</Text>
          </TouchableOpacity>
        ) : (currentStep === 5 && (autoCompleteLoading || autoCompleteResult || autoCompleteError )) ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {autoCompleteResult ? 'View Schedule' : 'Continue'}
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      <BackgroundSvg hue={210} style = {{zIndex: -1}} />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>WolfKey</Text>
          </View>

          {renderProgressIndicator()}
          {renderStepContent()}
        </ScrollView>
        
        {renderNavigationButtons()}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0ac40aff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#373a40ff',
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  step: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 100,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0e1219ff',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#34383fff',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#282f3bff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50, // Make room for the toggle button
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  errorCardText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 12,
    flex: 1,
  },
  backgroundLoadingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
  },
  backgroundLoadingText: {
    fontSize: 14,
    color: '#9a3412',
    marginLeft: 12,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  autoCompleteButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  autoCompleteGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    zIndex: 1,
  },
  autoCompleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  autoCompleteIcon: {
    color: '#00c3ff',
    borderRadius: 50,
    padding: 2,
    fontSize: 22,
    marginRight: 8,
  },
  autoCompleteButtonDisabled: {
    backgroundColor: 'grey',
    opacity: 0.7,
  },
  autoCompleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  courseSection: {
    marginBottom: 8,
  },
  courseSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  courseSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  scheduleContainer: {
    marginBottom: 20,
    maxHeight: 400,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for iOS safe area
  },
  navigationSpacer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5A2B',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  skipErrorButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  skipErrorButtonText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default RegisterScreen;
