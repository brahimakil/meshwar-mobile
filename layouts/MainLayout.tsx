import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { globalStyles } from '../themes';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  showBack,
  onBackPress,
  rightComponent
}) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={title}
        showBack={showBack}
        onBackPress={onBackPress}
        rightComponent={rightComponent}
      />
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
}); 