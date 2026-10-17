import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useEffect,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useAnimatedValue,
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

  const closedOpacity = useAnimatedValue(1);

  const openOpacity = useAnimatedValue(0);

  const cardOpacity = useAnimatedValue(0);

  const cardTranslateY = useAnimatedValue(18);

  const cardScale = useAnimatedValue(0.985);

  const openingOpacity = useAnimatedValue(1);

  useEffect(() => {
    Animated.sequence([
      // Closed box rests on screen.
      Animated.delay(900),

      // Slowly reveal the open box over the closed box.
      Animated.timing(openOpacity, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),

      // Remove the closed box only after the open box
      // is already fully visible.
      Animated.timing(closedOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Let the open box remain visible.
      Animated.delay(700),

      // Slowly bring up the branded-card version.
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(cardScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Once the branded image is completely visible,
      // gently remove the open-box image underneath.
      Animated.timing(openOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Give the branding time to be seen.
      Animated.delay(1200),

      // Fade smoothly into Home.
      Animated.timing(openingOpacity, {
        toValue: 0,
        duration: 1100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOpening(false);
    });
  }, [
    closedOpacity,
    openOpacity,
    cardOpacity,
    cardTranslateY,
    cardScale,
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
            <View style={styles.imageStage}>
              <Animated.Image
                source={require('../assets/images/recipe-box-closed.png')}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.boxImage,
                  {
                    opacity: closedOpacity,
                  },
                ]}
              />

              <Animated.Image
                source={require('../assets/images/recipe-box-open.png')}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.boxImage,
                  {
                    opacity: openOpacity,
                  },
                ]}
              />

              <Animated.Image
                source={require('../assets/images/recipe-box-brand-card.png')}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.boxImage,
                  {
                    opacity: cardOpacity,
                    transform: [
                      {
                        translateY: cardTranslateY,
                      },
                      {
                        scale: cardScale,
                      },
                    ],
                  },
                ]}
              />
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
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: '#F7F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageStage: {
    width: '100%',
    height: '76%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  boxImage: {
    position: 'absolute',
    width: '92%',
    height: '100%',
  },
});
