import React from 'react';
import { View, StyleSheet, Dimensions, SafeAreaView, StatusBar, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useAppStore } from '../store/appStore';

const { width, height } = Dimensions.get('window');

// 🚀 Your 1080x2340 screenshots
const slides = [
  {
    key: 'slide1',
    title: 'Discover & Compare',
    text: 'Browse thousands of verified industrial chemicals. Compare purity, MOQ, and prices side-by-side.',
    image: require('../../assets/slide1.jpg'), 
    bgColor: '#F0F9FF', 
  },
  {
    key: 'slide2',
    title: 'Custom RFQs',
    text: "Can't find your target price? Send Custom Quote Requests and negotiate directly with top suppliers.",
    image: require('../../assets/slide2.jpg'), 
    bgColor: '#F0FDF4', 
  },
  {
    key: 'slide3',
    title: 'Become a Seller',
    text: 'Want to sell your own chemicals? Go to your Account screen and tap "Switch to Seller Mode" instantly.',
    image: require('../../assets/slide3.jpg'), 
    bgColor: '#FFFBEB',
  },
  {
    key: 'slide4',
    title: 'List Your Products',
    text: 'Easily fill in your chemical specifications, set your pricing tiers, and start reaching thousands of buyers!',
    image: require('../../assets/slide4.jpg'), 
    bgColor: '#FAF5FF', 
  }
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { completeOnboarding } = useAppStore();

  const renderItem = ({ item }: { item: typeof slides[0] }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
        
        {/* 📱 App Screenshot Container */}
        <View style={styles.imageWrapper}>
          <Image 
            source={item.image} 
            style={styles.screenshot}
            // 🚀 Changed to 'contain' to ensure the whole 1080x2340 image is visible
            resizeMode="contain" 
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            {item.title}
          </Text>
          <Text variant="bodyLarge" style={styles.text}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderNextButton = () => (
    <View style={styles.nextButton}>
      <Text style={styles.nextButtonText}>Next</Text>
    </View>
  );

  const renderDoneButton = () => (
    <View style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.doneButtonText}>Get Started</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <AppIntroSlider
        renderItem={renderItem}
        data={slides}
        onDone={completeOnboarding} 
        onSkip={completeOnboarding}
        showSkipButton={true}
        bottomButton={true}
        renderDoneButton={renderDoneButton}
        renderNextButton={renderNextButton}
        activeDotStyle={{ backgroundColor: theme.colors.primary, width: 32, height: 8, borderRadius: 4 }}
        dotStyle={{ backgroundColor: 'rgba(0,0,0,0.1)', width: 8, height: 8, borderRadius: 4 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    // Reduced padding to allow the tall image to fit on smaller screens
    paddingTop: height * 0.08, 
  },
  imageWrapper: {
    // 🚀 We set the height to take up about 55% of the screen
    height: height * 0.55, 
    // 🚀 We force the width to match the 1080:2340 aspect ratio (1:2.16)
    aspectRatio: 1080 / 2340, 
    marginBottom: 35,
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    
    backgroundColor: '#000', // Black bezel makes it look like a phone screen
    borderRadius: 24, 
    padding: 6, // Thickness of the "phone bezel"
  },
  screenshot: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 18, 
    backgroundColor: 'white', // In case of any transparent edges
  },
  textContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  text: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 15,
  },
  nextButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#1E293B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  doneButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});