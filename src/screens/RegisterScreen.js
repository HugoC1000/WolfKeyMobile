import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import BackgroundSvg from '../components/BackgroundSVG';
import CourseSelector from '../components/CourseSelector';
import ScheduleTab from '../components/ScheduleTab';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const RegisterScreen = () => {
  const { register } = useAuth();
  const { loadUser } = useUser();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [stepProgress] = useState(new Animated.Value(1));
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    school_email: '',
    personal_email: '',
  password: '',
    confirm_password: '',
  });


  // Grade level choices (8-13 where 13 represents alumni)
  const [gradeLevels] = useState(['8', '9', '10', '11', '12', '13']);
  const [showGradeOptions, setShowGradeOptions] = useState(false);
  
  const [errors, setErrors] = useState({});
  
  const [experiencedCourses, setExperiencedCourses] = useState([]);
  const [helpNeededCourses, setHelpNeededCourses] = useState([]);
  
  // Manual schedule input (optional)
  const [manualSchedule, setManualSchedule] = useState({});
  
  const [savedExperiencedCourses, setSavedExperiencedCourses] = useState([]);
  const [savedHelpNeededCourses, setSavedHelpNeededCourses] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Preference settings (default to true)
  const [allowScheduleComparison, setAllowScheduleComparison] = useState(true);
  const [allowGradeUpdates, setAllowGradeUpdates] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Bottom sheet for selecting courses (registration flow)
  const bottomSheetRef = useRef(null);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [bsSubmitting, setBsSubmitting] = useState(false);
  const snapPoints = useMemo(() => ['45%', '70%', '90%'], []);

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
      case 4:
        if (experiencedCourses.length < 3) {
          newErrors.experienced = 'Please select at least 3 courses you can help with';
        }
        if (helpNeededCourses.length < 3) {
          newErrors.help = 'Please select at least 3 courses you need help with';
        }
        break;
      case 5:
        // Schedule is optional, no validation needed
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

  const handleGradeLevelChange = (value) => {
    setFormData(prev => ({ ...prev, grade_level: value }));
    setShowGradeOptions(false);
    if (errors.grade_level) {
      setErrors(prev => ({ ...prev, grade_level: null }));
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
      
      // Save course selections when going back from courses step (step 4)
      if (nextStep === 4 && currentStep === 5) {
        setSavedExperiencedCourses(experiencedCourses);
        setSavedHelpNeededCourses(helpNeededCourses);
      }
      
      // Restore course selections when coming back to courses step (step 4)
      if (nextStep === 4 && (savedExperiencedCourses.length > 0 || savedHelpNeededCourses.length > 0)) {
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
      if (currentStep === 5) {
        // Coming from schedule step - submit
        handleSubmit();
      } else {
        transitionToStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Save course selections when going back from courses step (step 4)
      if (currentStep === 5) {
        setSavedExperiencedCourses(experiencedCourses);
        setSavedHelpNeededCourses(helpNeededCourses);
      }
      
      transitionToStep(currentStep - 1);
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
    if (courseId == null) return;
    const scheduleSource = manualSchedule;
    if (!scheduleSource) return;
    const courseObj = Object.values(scheduleSource).find(c => c && c.course_id === courseId);
    if (!courseObj) return;
    const experienceEntry = {
      id: courseObj.course_id,
      name: courseObj.course,
      category: 'Unknown',
    };
    setExperiencedCourses(prev => {
      const exists = prev.some(c => c.id === courseId);
      return exists ? prev : [...prev, experienceEntry];
    });
  };

  const handleAddHelp = (courseId) => {
    if (courseId == null) return;
    const scheduleSource = manualSchedule;
    if (!scheduleSource) return;
    const courseObj = Object.values(scheduleSource).find(c => c && c.course_id === courseId);
    if (!courseObj) return;
    const helpEntry = {
      id: courseObj.course_id,
      name: courseObj.course,
      category: 'Unknown',
    };
    setHelpNeededCourses(prev => {
      const exists = prev.some(c => c.id === courseId);
      return exists ? prev : [...prev, helpEntry];
    });
  };

  // Registration bottom sheet handlers (mirror ProfileScreen behavior)
  const handleCoursePress = (courseOrBlock, block) => {
    const blockToEdit = block || courseOrBlock;
    setSelectedBlock(blockToEdit);
    setShowCourseSelector(true);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleCourseSelection = (courses) => {
    setSelectedCourses(courses);
  };

  const handleSubmitCourseSelection = async () => {
    if (selectedCourses.length > 0 && selectedBlock) {
      const course = selectedCourses[0];
      setBsSubmitting(true);
      try {
        if (selectedBlock === 'experience') {
          setExperiencedCourses(prev => {
            const deriveKey = (c) => (c?.id !== undefined && c?.id !== null) ? String(c.id) : (c?.name || c?.raw_text ? `raw:${c.name ?? c.raw_text}` : null);
            const key = deriveKey(course);
            return prev.some(c => deriveKey(c) === key) ? prev : [...prev, course];
          });
        } else if (selectedBlock === 'help') {
          setHelpNeededCourses(prev => {
            const deriveKey = (c) => (c?.id !== undefined && c?.id !== null) ? String(c.id) : (c?.name || c?.raw_text ? `raw:${c.name ?? c.raw_text}` : null);
            const key = deriveKey(course);
            return prev.some(c => deriveKey(c) === key) ? prev : [...prev, course];
          });
        } else {
          // This is a schedule block update (e.g., editing 1A, 1B, etc.)
          // Update the manual schedule with the selected course
          const normalizedScheduleEntry = {
            course: course?.name ?? course?.raw_text ?? null,
            course_id: course?.id ?? null,
            raw_text: course?.raw_text ?? null,
          };

          const blockKey = `block_${selectedBlock}`;
          setManualSchedule(prev => ({
            ...prev,
            [blockKey]: normalizedScheduleEntry
          }));
        }

        // close sheet
        bottomSheetRef.current?.close();
        setSelectedCourses([]);
        setSelectedBlock(null);
        setShowCourseSelector(false);
      } catch (error) {
        console.error('Error selecting course in registration sheet:', error);
      } finally {
        setBsSubmitting(false);
      }
    }
  };

  const handleCloseCourseSelector = () => {
    setSelectedCourses([]);
    bottomSheetRef.current?.close();
  };

  // Final submission
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      // Build schedule data as { block_1A: course_id, ... }
      let scheduleData = {};
      const scheduleSource = manualSchedule || {};
      Object.keys(scheduleSource).forEach(blockKey => {
        scheduleData[blockKey] = scheduleSource[blockKey]?.course_id ?? null;
      });

      const registrationData = {
        ...formData,
        password1: formData.password,
        password2: formData.confirm_password,
        experienced_courses: experiencedCourses.map(c => c.id),
        help_needed_courses: helpNeededCourses.map(c => c.id),
        schedule: scheduleData,
        allow_schedule_comparison: allowScheduleComparison,
        allow_grade_updates: allowGradeUpdates,
      };
      
      // Remove the original password fields as we're using password1/password2
      delete registrationData.password;
      delete registrationData.confirm_password;
      
      await register(registrationData, loadUser);
      
      Alert.alert(
        'Welcome to WolfKey!',
        'Your account has been created successfully.',
        [{ text: 'OK', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      // Extract error message from API response or error message
      let errorMessage = 'Please try again';
      
      if (error.response?.data?.error) {
        // API returned a structured error in response
        errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : error.response.data.error.message || 'Registration failed';
      } else if (error.message) {
        // Use the error message
        errorMessage = error.message;
      }

      console.log("err:", errorMessage);
      
      // Check if it's an email-related error
      if (errorMessage.includes('school_email') && errorMessage.includes('already registered')) {
        setErrors(prev => ({ 
          ...prev, 
          school_email: 'This email is already registered. Please use a different email or try logging in.' 
        }));
        if (currentStep > 2) {
          transitionToStep(2);
        }
        return; // Don't show alert since we're showing inline error
      }
      
      // Clean up the error message (remove markdown-style asterisks)
      errorMessage = errorMessage.replace(/\*/g, '').trim();
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress indicator
  const renderProgressIndicator = () => {

    const totalSteps = 5; 
    const progress = stepProgress.interpolate({
      inputRange: [1, totalSteps],
      outputRange: ['20%', '100%'],
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
        {currentStep === 4 && renderCoursesStep()}
        {currentStep === 5 && renderScheduleStep()}
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

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Grade Level (Optional)</Text>
        <TouchableOpacity
          style={[styles.input, styles.selectInput]}
          onPress={() => setShowGradeOptions(!showGradeOptions)}
        >
          <Text style={{ color: formData.grade_level ? '#111827' : '#6b7280' }}>
            {formData.grade_level ? (formData.grade_level === '13' ? 'Alumni (13)' : `Grade ${formData.grade_level}`) : 'Select your grade level'}
          </Text>
        </TouchableOpacity>

        {showGradeOptions && (
          <View style={styles.selectOptions}>
            {gradeLevels.map(g => (
              <TouchableOpacity
                key={g}
                style={styles.selectOption}
                onPress={() => handleGradeLevelChange(g)}
              >
                <Text style={styles.selectOptionText}>{g === '13' ? 'Alumni (13)' : `Grade ${g}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.helperText}>Your current grade level (8 - 13 for alumni). If in summer, grade level in Sept</Text>
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
  // Step 4: Course Selection
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

      {/* Privacy Preferences */}
      <View style={styles.preferencesSection}>
        <Text style={styles.preferencesSectionTitle}>Privacy Preferences</Text>
        
        <TouchableOpacity 
          style={styles.preferenceItem}
          onPress={() => setAllowScheduleComparison(!allowScheduleComparison)}
        >
          <View style={styles.preferenceContent}>
            <MaterialIcons 
              name={allowScheduleComparison ? "check-box" : "check-box-outline-blank"} 
              size={24} 
              color={allowScheduleComparison ? "#2563eb" : "#9ca3af"} 
            />
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Allow Schedule Comparison</Text>
              <Text style={styles.preferenceDescription}>
                Let others see if you share classes with them
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.preferenceItem}
          onPress={() => setAllowGradeUpdates(!allowGradeUpdates)}
        >
          <View style={styles.preferenceContent}>
            <MaterialIcons 
              name={allowGradeUpdates ? "check-box" : "check-box-outline-blank"} 
              size={24} 
              color={allowGradeUpdates ? "#2563eb" : "#9ca3af"} 
            />
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Allow Grade Updates</Text>
              <Text style={styles.preferenceDescription}>
                Receive notifications about grade changes
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 5: Schedule Input (Optional)
  const renderScheduleStep = () => (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="schedule" size={36} color="#8B5A2B" />
        <Text style={styles.stepTitle}>Your Schedule</Text>
        <Text style={styles.stepSubtitle}>Optional - Input your schedule</Text>
      </View>

      <View style={styles.scheduleContainer}>
        <ScheduleTab
          schedule={manualSchedule}
          isCurrentUser={true}
          experiencedCourses={experiencedCourses}
          helpNeededCourses={helpNeededCourses}
          onAddExperience={handleAddExperience}
          onAddHelp={handleAddHelp}
          onCoursePress={handleCoursePress}
          onAutoComplete={() => {}}
          autoCompleteLoading={false}
        />
      </View>
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
        
        {currentStep === 5 ? (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleNext}
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
        {/* Bottom sheet for course selection during registration */}
        {showCourseSelector && (
          <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            onChange={() => {}}
            enablePanDownToClose={false}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
          >
            <BottomSheetView style={styles.bottomSheetContainer}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Course</Text>
                <TouchableOpacity onPress={handleCloseCourseSelector} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <CourseSelector onCourseSelect={handleCourseSelection} />

              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseCourseSelector}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, (selectedCourses.length === 0 || bsSubmitting) && styles.submitButtonDisabled]}
                  onPress={handleSubmitCourseSelection}
                  disabled={selectedCourses.length === 0 || bsSubmitting}
                >
                  <Text style={styles.submitButtonText}>{bsSubmitting ? 'Adding...' : 'Add Course'}</Text>
                </TouchableOpacity>
              </View>
            </BottomSheetView>
          </BottomSheet>
        )}
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
    paddingHorizontal: 15,
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 100,
    minHeight: 520,
    overflow: 'visible',
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
  disabledFeatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 8,
  },
  disabledFeatureText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
    fontWeight: '500',
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
  preferencesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  preferencesSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  preferenceItem: {
    marginBottom: 16,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  preferenceTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  scheduleContainer: {
  marginBottom: 20,
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
  selectInput: {
    justifyContent: 'center',
  },
  selectOptions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleIndicator: {
    backgroundColor: '#ddd',
    width: 40,
    height: 4,
  },
  bottomSheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 30,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1b',
    marginBottom: 4,
  },
  bottomSheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    backgroundColor: 'white',
  },
  closeButton: {
    padding: 4,
  },
});

export default RegisterScreen;
