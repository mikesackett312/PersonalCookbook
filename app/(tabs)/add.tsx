import { Redirect } from 'expo-router';

// Direct links to this route open the same editor as the Add tab action.
export default function AddTabScreen() {
  return <Redirect href="/add-recipe" />;
}
