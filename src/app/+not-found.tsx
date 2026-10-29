import { Redirect } from 'expo-router';

// Any unknown address (for example when the web build is hosted under a sub-path) goes to the start screen.
export default function NotFound() {
  return <Redirect href="/" />;
}
