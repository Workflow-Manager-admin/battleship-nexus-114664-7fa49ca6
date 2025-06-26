import React from "react";

// PUBLIC_INTERFACE
/**
 * Show/edit user profile.
 */
function ProfilePage({ username }) {
  return (
    <div className="container">
      <h2>Profile</h2>
      <p><b>Username:</b> {username}</p>
      {/* Placeholder for future profile features */}
    </div>
  );
}
export default ProfilePage;
