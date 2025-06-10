import { Platform } from 'react-native';

// Platform-specific imports
let MapComponent: React.ComponentType<any>;

if (Platform.OS === 'web') {
  MapComponent = require('./Map.web').default;
} else {
  MapComponent = require('./Map.native').default;
}

export default MapComponent; 