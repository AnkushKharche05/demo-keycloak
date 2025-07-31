import React, { useEffect, useState } from 'react';
import keycloak from './keycloak';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    keycloak.init({ onLoad: 'login-required' }).then(auth => {
      setAuthenticated(auth);
    });
  }, []);

  if (!authenticated) {
    return <div>Loading Keycloak...</div>;
  }

  return (
    <div>
      <h2>Welcome, {keycloak.tokenParsed?.preferred_username}</h2>
      <button onClick={() => keycloak.logout()}>Logout</button>
    </div>
  );
}

export default App;
