import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { MOOD_VISUALS, type EyeStyle, type MouthStyle } from '../constants/moods';
import { colors } from '../constants/theme';
import type { MoodState } from '../types';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface PenneyCharacterProps {
  mood: MoodState;
  size?: number;
}

export function PenneyCharacter({ mood, size = 168 }: PenneyCharacterProps) {
  const visual = MOOD_VISUALS[mood];
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bob.setValue(0);
    if (visual.bobAmplitude === 0) return;

    const timing = (toValue: number) =>
      Animated.timing(bob, {
        toValue,
        duration: visual.bobDurationMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: USE_NATIVE_DRIVER,
      });

    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    loop.start();
    return () => loop.stop();
  }, [bob, visual.bobAmplitude, visual.bobDurationMs]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -visual.bobAmplitude] });
  const shadowScale = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] });

  const inner = size * 0.84;
  const stroke = Math.max(3, Math.round(size * 0.028));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Penney the coin, looking ${visual.label.toLowerCase()}`}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: visual.rimColor },
          ]}
        >
          <View
            style={[
              styles.circle,
              {
                width: inner,
                height: inner,
                borderRadius: inner / 2,
                backgroundColor: visual.faceColor,
                borderWidth: Math.max(2, stroke * 0.6),
                borderColor: visual.rimColor,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={[
                styles.shine,
                {
                  width: inner * 0.34,
                  height: inner * 0.15,
                  borderRadius: inner * 0.08,
                  top: inner * 0.12,
                  left: inner * 0.14,
                  backgroundColor: visual.shineColor,
                },
              ]}
            />
            <Face
              eyes={visual.eyes}
              mouth={visual.mouth}
              size={inner}
              stroke={stroke}
              faceColor={visual.faceColor}
            />
          </View>
        </View>
      </Animated.View>
      <Animated.View
        style={[
          styles.shadow,
          {
            width: size * 0.62,
            height: size * 0.08,
            borderRadius: size * 0.04,
            marginTop: size * 0.08,
            transform: [{ scaleX: shadowScale }],
          },
        ]}
      />
    </View>
  );
}

interface FaceProps {
  eyes: EyeStyle;
  mouth: MouthStyle;
  size: number;
  stroke: number;
  faceColor: string;
}

function Face({ eyes, mouth, size, stroke, faceColor }: FaceProps) {
  const eyeSize = size * 0.13;
  return (
    <View style={[StyleSheet.absoluteFill, styles.face]}>
      <View style={[styles.eyesRow, { gap: size * 0.2, marginTop: size * 0.32 }]}>
        <Eye variant={eyes} size={eyeSize} stroke={stroke} faceColor={faceColor} side="left" />
        <Eye variant={eyes} size={eyeSize} stroke={stroke} faceColor={faceColor} side="right" />
      </View>
      <View style={[styles.mouthArea, { marginTop: size * 0.1, height: size * 0.18 }]}>
        <Mouth variant={mouth} size={size} stroke={stroke} />
      </View>
    </View>
  );
}

interface EyeProps {
  variant: EyeStyle;
  size: number;
  stroke: number;
  faceColor: string;
  side: 'left' | 'right';
}

function Eye({ variant, size, stroke, faceColor, side }: EyeProps) {
  if (variant === 'happy') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center' }}>
        <View
          style={{
            width: size,
            height: size / 2 + stroke,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderTopWidth: stroke,
            borderLeftWidth: stroke,
            borderRightWidth: stroke,
            borderColor: colors.ink,
          }}
        />
      </View>
    );
  }

  const brow =
    variant === 'skeptical' ? (
      <View
        style={{
          position: 'absolute',
          top: side === 'right' ? -size * 0.75 : -size * 0.45,
          width: size * 1.2,
          height: stroke,
          borderRadius: stroke,
          backgroundColor: colors.ink,
          transform: [{ rotate: side === 'right' ? '-12deg' : '4deg' }],
        }}
      />
    ) : null;

  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {brow}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.ink,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size * 0.16,
            top: size * 0.16,
            left: size * 0.18,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
          }}
        />
        {variant === 'lidded' ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: size * 0.55,
              backgroundColor: faceColor,
              borderBottomWidth: Math.max(2, stroke * 0.8),
              borderBottomColor: colors.ink,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

interface MouthProps {
  variant: MouthStyle;
  size: number;
  stroke: number;
}

function Mouth({ variant, size, stroke }: MouthProps) {
  if (variant === 'smile') {
    const width = size * 0.34;
    return (
      <View
        style={{
          width,
          height: width / 2,
          borderBottomLeftRadius: width / 2,
          borderBottomRightRadius: width / 2,
          borderBottomWidth: stroke,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderColor: colors.ink,
        }}
      />
    );
  }

  if (variant === 'smirk') {
    return (
      <View
        style={{
          width: size * 0.2,
          height: stroke,
          borderRadius: stroke,
          backgroundColor: colors.ink,
          transform: [{ translateX: size * 0.04 }, { rotate: '-10deg' }],
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: variant === 'line' ? size * 0.3 : size * 0.2,
        height: stroke,
        borderRadius: stroke,
        backgroundColor: colors.ink,
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  shine: { position: 'absolute', transform: [{ rotate: '-20deg' }] },
  face: { alignItems: 'center' },
  eyesRow: { flexDirection: 'row', alignItems: 'center' },
  mouthArea: { alignItems: 'center', justifyContent: 'center' },
  shadow: { backgroundColor: 'rgba(43, 33, 22, 0.15)' },
});
