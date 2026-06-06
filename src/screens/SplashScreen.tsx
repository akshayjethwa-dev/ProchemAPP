import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  Dimensions, 
  Platform,
  StatusBar
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ✅ Auto-redirect after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 4000);

    return () => clearTimeout(timer); // Cleanup on unmount
  }, [navigation]);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#004AAD" />
      
      {/* Connectivity & Map Background Pattern */}
      <View style={styles.backgroundDecorations}>
        {/* Simulating a connected network spread */}
        <MaterialCommunityIcons name="earth" size={350} color="rgba(255,255,255,0.03)" style={styles.bgIcon1} />
        {/* FIXED: Replaced invalid "chart-network" with "lan" */}
        <MaterialCommunityIcons name="lan" size={250} color="rgba(255,255,255,0.04)" style={styles.bgIcon2} />
        <MaterialCommunityIcons name="molecule" size={180} color="rgba(255,255,255,0.05)" style={styles.bgIcon3} />
        <MaterialCommunityIcons name="map-marker-path" size={200} color="rgba(255,255,255,0.04)" style={styles.bgIcon4} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        
        {/* TOP SECTION: Logo & Tagline */}
        <View style={styles.topSection}>
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>
            Buy, Sell & Source Chemicals{'\n'}Across India
          </Text>
        </View>

        {/* MIDDLE SECTION: Perfect 2x2 Grid */}
        <View style={styles.cardContainer}>
          <View style={styles.featuresGrid}>
            
            {/* Feature 1 */}
            <View style={styles.featureTile}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="handshake-outline" size={28} color="#004AAD" />
              </View>
              <Text style={styles.featureText}>
                <Text style={styles.highlightText}>Connect</Text>{'\n'}with verified Buyers & Sellers
              </Text>
            </View>

            {/* Feature 2 */}
            <View style={styles.featureTile}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="flask-outline" size={28} color="#004AAD" />
              </View>
              <Text style={styles.featureText}>
                <Text style={styles.highlightText}>Explore</Text>{'\n'}with Range of Chemicals
              </Text>
            </View>

            {/* Feature 3 */}
            <View style={styles.featureTile}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="shield-check-outline" size={28} color="#004AAD" />
              </View>
              <Text style={styles.featureText}>
                <Text style={styles.highlightText}>Trusted</Text>{'\n'}Secure & Reliable platform
              </Text>
            </View>

            {/* Feature 4 */}
            <View style={styles.featureTile}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="trending-up" size={28} color="#004AAD" />
              </View>
              <Text style={styles.featureText}>
                <Text style={styles.highlightText}>Grow</Text>{'\n'}expand your Chemical Business
              </Text>
            </View>

          </View>
        </View>

        {/* BOTTOM SECTION: Get Started Button */}
        <View style={styles.bottomSection}>
          <Button 
            mode="contained" 
            onPress={() => navigation.replace('Login')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            buttonColor="#FFFFFF"
            textColor="#004AAD"
            icon="arrow-right"
          >
            Get Started
          </Button>
          <Text style={styles.footerText}>
            Join India's Leading B2B Chemical Network
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#004AAD', // Prochem Primary Dark Blue
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  /* --- Background Decoration Styles --- */
  backgroundDecorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgIcon1: {
    position: 'absolute',
    top: -50,
    right: -80,
  },
  bgIcon2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: -60,
  },
  bgIcon3: {
    position: 'absolute',
    top: height * 0.35,
    left: -40,
    transform: [{ rotate: '30deg' }]
  },
  bgIcon4: {
    position: 'absolute',
    bottom: height * 0.4,
    right: -40,
  },
  /* ------------------------------------ */
  
  topSection: {
    alignItems: 'center',
    paddingTop: height * 0.06, 
    paddingHorizontal: 24,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 180,
    height: 60,
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardContainer: {
    paddingHorizontal: 20,
    alignItems: 'center', 
  },
  featuresGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  featureTile: {
    width: '48%', 
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    backgroundColor: '#EFF6FF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    textAlign: 'center',
  },
  highlightText: {
    color: '#004AAD',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 10 : 30,
    alignItems: 'center',
  },
  button: { 
    width: '100%',
    borderRadius: 16, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonContent: {
    height: 60,
    flexDirection: 'row-reverse',
  },
  buttonLabel: {
    fontSize: 18, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerText: {
    color: '#BFDBFE',
    fontSize: 13,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  }
});