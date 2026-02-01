import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [deletingUserName, setDeletingUserName] = useState(null);

  const url = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

  useEffect(() => {
    fetchReportData(currentPage);
  }, [currentPage]);

  const fetchReportData = async (page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${url}/db-info?limit=${limit}&page=${page}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch report data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= reportData.pagination.total_pages) {
      setCurrentPage(newPage);
    }
  };

  const handleDeleteUser = async (userName) => {
    if (!userName || !userName.trim()) {
      alert("Invalid userName");
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete all data for user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserName(userName);

    try {
      const response = await fetch(`${url}/delete-user/${encodeURIComponent(userName)}`, {
        method: "DELETE",
      });

      const result = await response.json();
      console.log("Delete response:", result);
      
      if (response.ok) {
        alert(`User "${userName}" deleted successfully! ${result.remaining_users} user(s) remaining.`);
        
        // Refresh the report data
        // If we're on a page that might now be empty, go to page 1
        if (reportData && reportData.users.length === 1 && currentPage > 1) {
          setCurrentPage(1);
        } else {
          fetchReportData(currentPage);
        }
      } else {
        alert(`Delete failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete user.");
    } finally {
      setDeletingUserName(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const paginationButtonStyle = (isActive) => {
    return {
      padding: "8px 12px",
      fontSize: "14px",
      backgroundColor: isActive ? "#007bff" : "#fff",
      color: isActive ? "white" : "#007bff",
      border: "1px solid #007bff",
      borderRadius: 4,
      cursor: "pointer",
      fontWeight: isActive ? "bold" : "normal"
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <h2>📊 User Report</h2>
        <p>Loading report data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <h2>📊 User Report</h2>
        <div style={{ 
          backgroundColor: "#f8d7da", 
          padding: 15, 
          borderRadius: 5, 
          color: "#721c24",
          margin: "20px auto",
          maxWidth: 600
        }}>
          <h4>❌ Error Loading Report</h4>
          <p>{error}</p>
          <button 
            onClick={() => fetchReportData(currentPage)}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginTop: 10
            }}
          >
            Retry
          </button>
        </div>
        <button 
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <h2>📊 User Report</h2>
        <p>No data available</p>
        <button 
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  const { users, pagination, total_users, total_embeddings } = reportData;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 30
      }}>
        <h2>📊 User Training Report</h2>
        <button 
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          ← Back to Home
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 15,
        marginBottom: 30
      }}>
        <div style={{
          backgroundColor: "#e3f2fd",
          padding: 20,
          borderRadius: 8,
          border: "1px solid #2196f3"
        }}>
          <h3 style={{ margin: 0, color: "#1976d2" }}>Total Users</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0", color: "#1976d2" }}>
            {total_users}
          </p>
        </div>
        <div style={{
          backgroundColor: "#f3e5f5",
          padding: 20,
          borderRadius: 8,
          border: "1px solid #9c27b0"
        }}>
          <h3 style={{ margin: 0, color: "#7b1fa2" }}>Total Embeddings</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0", color: "#7b1fa2" }}>
            {total_embeddings}
          </p>
        </div>
        <div style={{
          backgroundColor: "#e8f5e9",
          padding: 20,
          borderRadius: 8,
          border: "1px solid #4caf50"
        }}>
          <h3 style={{ margin: 0, color: "#388e3c" }}>Current Page</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0", color: "#388e3c" }}>
            {pagination.page} / {pagination.total_pages}
          </p>
        </div>
        <div style={{
          backgroundColor: "#fff3e0",
          padding: 20,
          borderRadius: 8,
          border: "1px solid #ff9800"
        }}>
          <h3 style={{ margin: 0, color: "#f57c00" }}>Showing</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0", color: "#f57c00" }}>
            {pagination.returned_count}
          </p>
        </div>
      </div>

      {/* Users Table */}
      {users && users.length > 0 ? (
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 8, 
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  User Name
                </th>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  Total Images
                </th>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  Embedding Count
                </th>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  Training Sessions
                </th>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  First Training
                </th>
                <th style={{ padding: "15px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  Last Training
                </th>
                <th style={{ padding: "15px", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "bold" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr 
                  key={user.userName || index}
                  style={{ 
                    borderBottom: "1px solid #eee",
                    backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9"
                  }}
                >
                  <td style={{ padding: "15px", fontWeight: "bold", color: "#1976d2" }}>
                    {user.userName || "N/A"}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {user.total_images || 0}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {user.embedding_count || 0}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {user.total_training_sessions || 0}
                  </td>
                  <td style={{ padding: "15px", fontSize: "14px", color: "#666" }}>
                    {formatDate(user.first_training)}
                  </td>
                  <td style={{ padding: "15px", fontSize: "14px", color: "#666" }}>
                    {formatDate(user.last_training)}
                  </td>
                  <td style={{ padding: "15px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDeleteUser(user.userName)}
                      disabled={deletingUserName === user.userName}
                      style={{
                        padding: "6px 12px",
                        fontSize: "14px",
                        backgroundColor: deletingUserName === user.userName ? "#ccc" : "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: deletingUserName === user.userName ? "not-allowed" : "pointer",
                        display: "inline-block"
                      }}
                      title={`Delete user ${user.userName}`}
                    >
                      {deletingUserName === user.userName ? (
                        "⏳ Deleting..."
                      ) : (
                        "🗑️ Delete"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: "#fff3cd", 
          padding: 20, 
          borderRadius: 8, 
          border: "1px solid #ffc107",
          textAlign: "center"
        }}>
          <p style={{ margin: 0, fontSize: "16px", color: "#856404" }}>
            No users found in the database.
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.total_pages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          gap: 10,
          marginTop: 30,
          padding: 20,
          backgroundColor: "#f8f9fa",
          borderRadius: 8
        }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_previous}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: pagination.has_previous ? "#007bff" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 5,
              cursor: pagination.has_previous ? "pointer" : "not-allowed"
            }}
          >
            ← Previous
          </button>
          
          <div style={{ 
            display: "flex", 
            gap: 5,
            alignItems: "center"
          }}>
            <span style={{ padding: "0 10px", fontSize: "16px" }}>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            {pagination.total_pages <= 10 ? (
              // Show all page numbers if total pages <= 10
              Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "14px",
                    backgroundColor: pageNum === currentPage ? "#007bff" : "#fff",
                    color: pageNum === currentPage ? "white" : "#007bff",
                    border: "1px solid #007bff",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: pageNum === currentPage ? "bold" : "normal"
                  }}
                >
                  {pageNum}
                </button>
              ))
            ) : (
              // Show limited page numbers for large page counts
              <>
                {currentPage > 3 && (
                  <>
                    <button onClick={() => handlePageChange(1)} style={paginationButtonStyle(1 === currentPage)}>1</button>
                    {currentPage > 4 && <span>...</span>}
                  </>
                )}
                {Array.from({ length: 5 }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.total_pages - 4, currentPage - 2)) + i;
                  if (pageNum > pagination.total_pages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={paginationButtonStyle(pageNum === currentPage)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {currentPage < pagination.total_pages - 2 && (
                  <>
                    {currentPage < pagination.total_pages - 3 && <span>...</span>}
                    <button onClick={() => handlePageChange(pagination.total_pages)} style={paginationButtonStyle(pagination.total_pages === currentPage)}>
                      {pagination.total_pages}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: pagination.has_next ? "#007bff" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 5,
              cursor: pagination.has_next ? "pointer" : "not-allowed"
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Pagination Info */}
      <div style={{ 
        marginTop: 20, 
        padding: 15, 
        backgroundColor: "#e9ecef", 
        borderRadius: 5,
        fontSize: "14px",
        textAlign: "center"
      }}>
        <p style={{ margin: 0 }}>
          Showing {pagination.offset + 1} to {pagination.offset + pagination.returned_count} of {total_users} users
        </p>
      </div>
    </div>
  );
};

export default UserReport;
