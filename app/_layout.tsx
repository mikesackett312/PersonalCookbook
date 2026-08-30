import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [showOpening, setShowOpening] = useState(true);

  const cardTranslateY = useRef(
    new Animated.Value(54)
  ).current;

  const cardOpacity = useRef(
    new Animated.Value(0.94)
  ).current;

  const openingOpacity = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    Animated.sequence([
      // Brief pause before the card begins to rise
      Animated.delay(200),

      // Slow, smooth rise from the recipe box
      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: -66,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // Let the finished card remain visible
      Animated.delay(700),

      // Slow, smooth fade into Home
      Animated.timing(openingOpacity, {
        toValue: 0,
        duration: 800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOpening(false);
    });
  }, [
    cardOpacity,
    cardTranslateY,
    openingOpacity,
  ]);

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <View style={styles.app}>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              title: 'Modal',
            }}
          />
        </Stack>

        <StatusBar style="auto" />

        {showOpening && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.openingScreen,
              {
                opacity: openingOpacity,
              },
            ]}
          >
            <View style={styles.recipeBoxScene}>
              <View style={styles.boxBack} />

              <Animated.View
                style={[
                  styles.indexCard,
                  {
                    opacity: cardOpacity,
                    transform: [
                      {
                        translateY: cardTranslateY,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.cardOuterBorder}>
                  <View style={styles.cardInnerBorder}>
                    <Text style={styles.brandTitle}>
                      Recipe Box
                    </Text>

                    <Text style={styles.tagline}>
                      Cook. Remember. Share.
                    </Text>
                  </View>
                </View>
              </Animated.View>

              <View style={styles.boxFront}>
                <View style={styles.boxTopLip} />

                <View style={styles.boxPanel}>
                  <View style={styles.boxPanelLine} />
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },

  openingScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#F7F3EC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 90,
  },

  recipeBoxScene: {
    width: 330,
    height: 245,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  boxBack: {
    position: 'absolute',
    bottom: 54,
    width: 286,
    height: 82,
    backgroundColor: '#C7A57B',
    borderWidth: 1,
    borderColor: '#A88763',
    borderRadius: 10,
  },

  indexCard: {
    position: 'absolute',
    bottom: 78,
    width: 258,
    height: 142,
    backgroundColor: '#FFFDF8',
    borderRadius: 7,
    zIndex: 2,

    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  cardOuterBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CDBDA9',
    borderRadius: 7,
    padding: 5,
  },

  cardInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E3D8CA',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  brandTitle: {
    fontFamily: 'Georgia',
    fontSize: 31,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: '#302A25',
  },

  tagline: {
    fontFamily: 'Georgia',
    fontSize: 12.5,
    fontStyle: 'italic',
    letterSpacing: 0.25,
    color: '#7A3E2F',
    marginTop: 8,
  },

  boxFront: {
    position: 'absolute',
    bottom: 38,
    width: 286,
    height: 92,
    backgroundColor: '#B4936C',
    borderWidth: 1,
    borderColor: '#987858',
    borderRadius: 10,
    zIndex: 3,

    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  boxTopLip: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    height: 16,
    backgroundColor: '#C4A077',
    borderWidth: 1,
    borderColor: '#987858',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  boxPanel: {
    position: 'absolute',
    top: 23,
    left: 14,
    right: 14,
    bottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 57, 0.28)',
    borderRadius: 5,
  },

  boxPanelLine: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(118, 86, 57, 0.22)',
  },
});
