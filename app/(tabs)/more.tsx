import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../config/firebase';
import { MainLayout } from '../../layouts/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../themes';

interface UserProfile {
  displayName: string;
  email: string;
  location?: string;
  geminiApiKey?: string;
  role: string;
  createdAt: string;
  dob?: string;
  updatedAt?: string;
}

export default function MoreScreen() {
  const { colors: themeColors } = useTheme();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Form states
  const [location, setLocation] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Profile edit states
  const [editDisplayName, setEditDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // API Test feedback states
  const [apiTestResult, setApiTestResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });

  // Save feedback states
  const [saveResult, setSaveResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });

  // Profile save feedback states
  const [profileSaveResult, setProfileSaveResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setProfile(userData);
        setLocation(userData.location || '');
        setGeminiApiKey(userData.geminiApiKey || '');
        setEditDisplayName(userData.displayName || user.displayName || '');
      } else {
        // Fallback to auth user data if Firestore doc doesn't exist
        const fallbackProfile: UserProfile = {
          displayName: user.displayName || '',
          email: user.email || '',
          role: 'user',
          createdAt: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        setEditDisplayName(fallbackProfile.displayName);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const saveProfileEdit = async () => {
    if (!user || !editDisplayName.trim()) {
      setProfileSaveResult({
        status: 'error',
        message: 'Display name cannot be empty'
      });
      return;
    }
    
    try {
      setSavingProfile(true);
      setProfileSaveResult({ status: null, message: '' });
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: editDisplayName.trim(),
      });
      
      // Update Firestore document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editDisplayName.trim(),
        updatedAt: new Date().toISOString(),
      });
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          displayName: editDisplayName.trim(),
        });
      }
      
      setProfileSaveResult({
        status: 'success',
        message: 'Profile updated successfully!'
      });
      
      // Close modal after a delay to show success message
      setTimeout(() => {
        setEditModalVisible(false);
        setProfileSaveResult({ status: null, message: '' });
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileSaveResult({
        status: 'error',
        message: 'Failed to update profile. Please try again.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      setSaveResult({ status: null, message: '' });
      
      await updateDoc(doc(db, 'users', user.uid), {
        location: location.trim(),
        geminiApiKey: geminiApiKey.trim(),
        updatedAt: new Date().toISOString(),
      });
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          location: location.trim(),
          geminiApiKey: geminiApiKey.trim(),
        });
      }
      
      setSaveResult({
        status: 'success',
        message: 'Settings saved successfully!'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveResult({
        status: 'error',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const testGeminiApi = async () => {
    if (!geminiApiKey.trim()) {
      setApiTestResult({
        status: 'error',
        message: 'Please enter a Gemini API key first'
      });
      return;
    }
    
    setTestingApi(true);
    setApiTestResult({ status: null, message: '' });
    
    try {
      // Test API call to Gemini - Updated to use correct model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey.trim()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hello! Please respond with "API test successful" to confirm the connection.',
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
          setApiTestResult({
            status: 'success',
            message: 'API test successful! Your Gemini API key is working correctly.'
          });
        } else {
          setApiTestResult({
            status: 'error',
            message: 'Unexpected response format from Gemini API'
          });
        }
      } else {
        const errorData = await response.json();
        setApiTestResult({
          status: 'error',
          message: `Error: ${errorData.error?.message || 'Invalid API key or network error'}`
        });
      }
    } catch (error) {
      console.error('Error testing Gemini API:', error);
      setApiTestResult({
        status: 'error',
        message: 'Network error or invalid API key. Please check your connection and try again.'
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Clear API test result after 5 seconds
  useEffect(() => {
    if (apiTestResult.status) {
      const timer = setTimeout(() => {
        setApiTestResult({ status: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [apiTestResult.status]);

  // Clear save result after 5 seconds
  useEffect(() => {
    if (saveResult.status) {
      const timer = setTimeout(() => {
        setSaveResult({ status: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveResult.status]);

  // Clear profile save result after 3 seconds (shorter since modal closes)
  useEffect(() => {
    if (profileSaveResult.status && profileSaveResult.status !== 'success') {
      const timer = setTimeout(() => {
        setProfileSaveResult({ status: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [profileSaveResult.status]);

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <MainLayout title="Profile">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Profile">
      <ScrollView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: themeColors.surface }]}>
          <View style={[styles.avatarContainer, { backgroundColor: themeColors.primary }]}>
            <Ionicons name="person" size={32} color={themeColors.background} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <Text style={[styles.displayName, { color: themeColors.text }]}>
                {profile?.displayName || 'User'}
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: themeColors.card }]}
                onPress={() => setEditModalVisible(true)}
              >
                <Ionicons name="pencil" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.email, { color: themeColors.textSecondary }]}>
              {profile?.email}
            </Text>
            <View style={styles.profileDetails}>
              <View style={[styles.roleBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.roleText, { color: themeColors.background }]}>
                  {profile?.role?.toUpperCase() || 'USER'}
                </Text>
              </View>
              <Text style={[styles.joinedText, { color: themeColors.textSecondary }]}>
                Joined {formatDate(profile?.createdAt || '')}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Profile Information
          </Text>
          
          <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                Full Name
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {profile?.displayName || 'Not set'}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                Email Address
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {profile?.email}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                Account Type
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {profile?.role || 'User'}
              </Text>
            </View>
            
            {profile?.updatedAt && (
              <>
                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                    Last Updated
                  </Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>
                    {formatDate(profile.updatedAt)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Settings
          </Text>
          
          {/* Location Setting */}
          <View style={[styles.inputContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              📍 Your Location
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text 
              }]}
              placeholder="Enter your city or location"
              placeholderTextColor={themeColors.textSecondary}
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                // Clear previous save result when user types
                if (saveResult.status) {
                  setSaveResult({ status: null, message: '' });
                }
              }}
              multiline={false}
            />
            <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
              This helps us show you relevant activities in your area
            </Text>
          </View>

          {/* Gemini API Key Setting */}
          <View style={[styles.inputContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              🤖 Gemini AI API Key
            </Text>
            <View style={styles.apiKeyContainer}>
              <TextInput
                style={[styles.input, styles.apiKeyInput, { 
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.text 
                }]}
                placeholder="Enter your Gemini API key"
                placeholderTextColor={themeColors.textSecondary}
                value={geminiApiKey}
                onChangeText={(text) => {
                  setGeminiApiKey(text);
                  // Clear previous test and save results when user types
                  if (apiTestResult.status) {
                    setApiTestResult({ status: null, message: '' });
                  }
                  if (saveResult.status) {
                    setSaveResult({ status: null, message: '' });
                  }
                }}
                secureTextEntry={!showApiKey}
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.eyeButton, { backgroundColor: themeColors.card }]}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Ionicons 
                  name={showApiKey ? "eye-off" : "eye"} 
                  size={20} 
                  color={themeColors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.testButton, { 
                backgroundColor: apiTestResult.status === 'success' 
                  ? themeColors.success 
                  : apiTestResult.status === 'error' 
                    ? themeColors.error 
                    : themeColors.secondary,
                opacity: testingApi ? 0.7 : 1 
              }]}
              onPress={testGeminiApi}
              disabled={testingApi}
            >
              {testingApi ? (
                <ActivityIndicator size="small" color={themeColors.background} />
              ) : (
                <Ionicons 
                  name={
                    apiTestResult.status === 'success' 
                      ? "checkmark-circle" 
                      : apiTestResult.status === 'error' 
                        ? "close-circle" 
                        : "checkmark-circle"
                  } 
                  size={16} 
                  color={themeColors.background} 
                />
              )}
              <Text style={[styles.testButtonText, { color: themeColors.background }]}>
                {testingApi ? 'Testing...' : 
                 apiTestResult.status === 'success' ? 'Test Successful ✅' :
                 apiTestResult.status === 'error' ? 'Test Failed ❌' :
                 'Test API Key'}
              </Text>
            </TouchableOpacity>

            {/* API Test Result Display */}
            {apiTestResult.status && (
              <View style={[
                styles.testResultContainer, 
                { 
                  backgroundColor: apiTestResult.status === 'success' 
                    ? themeColors.success + '20' 
                    : themeColors.error + '20',
                  borderColor: apiTestResult.status === 'success' 
                    ? themeColors.success 
                    : themeColors.error,
                }
              ]}>
                <View style={styles.testResultHeader}>
                  <Ionicons 
                    name={apiTestResult.status === 'success' ? "checkmark-circle" : "alert-circle"} 
                    size={20} 
                    color={apiTestResult.status === 'success' ? themeColors.success : themeColors.error} 
                  />
                  <Text style={[
                    styles.testResultTitle,
                    { 
                      color: apiTestResult.status === 'success' 
                        ? themeColors.success 
                        : themeColors.error 
                    }
                  ]}>
                    {apiTestResult.status === 'success' ? 'Success!' : 'Failed!'}
                  </Text>
                </View>
                <Text style={[styles.testResultMessage, { color: themeColors.text }]}>
                  {apiTestResult.message}
                </Text>
              </View>
            )}
            
            <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
              Get your free API key from Google AI Studio
            </Text>
          </View>

          {/* Save Settings Button */}
          <TouchableOpacity
            style={[styles.saveButton, { 
              backgroundColor: saveResult.status === 'success' 
                ? themeColors.success 
                : saveResult.status === 'error' 
                  ? themeColors.error 
                  : themeColors.primary,
              opacity: saving ? 0.7 : 1 
            }]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={themeColors.background} />
            ) : (
              <Ionicons 
                name={
                  saveResult.status === 'success' 
                    ? "checkmark-circle" 
                    : saveResult.status === 'error' 
                      ? "close-circle" 
                      : "save"
                } 
                size={20} 
                color={themeColors.background} 
              />
            )}
            <Text style={[styles.saveButtonText, { color: themeColors.background }]}>
              {saving ? 'Saving...' : 
               saveResult.status === 'success' ? 'Saved Successfully ✅' :
               saveResult.status === 'error' ? 'Save Failed ❌' :
               'Save Settings'}
            </Text>
          </TouchableOpacity>

          {/* Save Result Display */}
          {saveResult.status && (
            <View style={[
              styles.testResultContainer, 
              { 
                backgroundColor: saveResult.status === 'success' 
                  ? themeColors.success + '20' 
                  : themeColors.error + '20',
                borderColor: saveResult.status === 'success' 
                  ? themeColors.success 
                  : themeColors.error,
              }
            ]}>
              <View style={styles.testResultHeader}>
                <Ionicons 
                  name={saveResult.status === 'success' ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={saveResult.status === 'success' ? themeColors.success : themeColors.error} 
                />
                <Text style={[
                  styles.testResultTitle,
                  { 
                    color: saveResult.status === 'success' 
                      ? themeColors.success 
                      : themeColors.error 
                  }
                ]}>
                  {saveResult.status === 'success' ? 'Saved!' : 'Error!'}
                </Text>
              </View>
              <Text style={[styles.testResultMessage, { color: themeColors.text }]}>
                {saveResult.message}
              </Text>
            </View>
          )}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Account
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.surface }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color={themeColors.error} />
            <Text style={[styles.actionButtonText, { color: themeColors.error }]}>
              Logout
            </Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            About
          </Text>
          <View style={[styles.infoContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
              Meshwar Mobile 
            </Text>
           
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={saveProfileEdit}
              style={[styles.modalSaveButton, { 
                opacity: savingProfile ? 0.7 : 1,
                backgroundColor: profileSaveResult.status === 'success' 
                  ? themeColors.success + '20' 
                  : profileSaveResult.status === 'error' 
                    ? themeColors.error + '20' 
                    : 'transparent',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.sm,
              }]}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Text style={[styles.modalSaveText, { 
                  color: profileSaveResult.status === 'success' 
                    ? themeColors.success 
                    : profileSaveResult.status === 'error' 
                      ? themeColors.error 
                      : themeColors.primary 
                }]}>
                  {profileSaveResult.status === 'success' ? 'Saved ✅' :
                   profileSaveResult.status === 'error' ? 'Error ❌' :
                   'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={[styles.modalSection, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: themeColors.text }]}>
                Personal Information
              </Text>
              
              <View style={styles.modalInputContainer}>
                <Text style={[styles.modalLabel, { color: themeColors.text }]}>
                  Full Name *
                </Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text 
                  }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={themeColors.textSecondary}
                  value={editDisplayName}
                  onChangeText={(text) => {
                    setEditDisplayName(text);
                    // Clear previous save result when user types
                    if (profileSaveResult.status) {
                      setProfileSaveResult({ status: null, message: '' });
                    }
                  }}
                  multiline={false}
                />
              </View>
              
              <View style={styles.modalInputContainer}>
                <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>
                  Email Address
                </Text>
                <Text style={[styles.readOnlyText, { color: themeColors.textSecondary }]}>
                  {profile?.email} (Cannot be changed)
                </Text>
              </View>

              {/* Profile Save Result Display */}
              {profileSaveResult.status && (
                <View style={[
                  styles.testResultContainer, 
                  { 
                    backgroundColor: profileSaveResult.status === 'success' 
                      ? themeColors.success + '20' 
                      : themeColors.error + '20',
                    borderColor: profileSaveResult.status === 'success' 
                      ? themeColors.success 
                      : themeColors.error,
                  }
                ]}>
                  <View style={styles.testResultHeader}>
                    <Ionicons 
                      name={profileSaveResult.status === 'success' ? "checkmark-circle" : "alert-circle"} 
                      size={20} 
                      color={profileSaveResult.status === 'success' ? themeColors.success : themeColors.error} 
                    />
                    <Text style={[
                      styles.testResultTitle,
                      { 
                        color: profileSaveResult.status === 'success' 
                          ? themeColors.success 
                          : themeColors.error 
                      }
                    ]}>
                      {profileSaveResult.status === 'success' ? 'Success!' : 'Error!'}
                    </Text>
                  </View>
                  <Text style={[styles.testResultMessage, { color: themeColors.text }]}>
                    {profileSaveResult.message}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
      </View>
      </Modal>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: spacing.lg,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  displayName: {
    ...typography.h2,
    flex: 1,
  },
  editButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  email: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  profileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    ...typography.caption,
    fontWeight: 'bold',
    fontSize: 10,
  },
  joinedText: {
    ...typography.caption,
    fontSize: 12,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    fontWeight: 'bold',
  },
  infoCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  inputContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    minHeight: 48,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiKeyInput: {
    flex: 1,
  },
  eyeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  testButtonText: {
    ...typography.body,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typography.body,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    ...typography.body,
    flex: 1,
  },
  infoContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    ...typography.caption,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    ...typography.h2,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    padding: spacing.xs,
  },
  modalSaveText: {
    ...typography.body,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalSection: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    fontWeight: 'bold',
  },
  modalInputContainer: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    minHeight: 48,
  },
  readOnlyText: {
    ...typography.body,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  testResultContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  testResultTitle: {
    ...typography.body,
    fontWeight: 'bold',
  },
  testResultMessage: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
}); 