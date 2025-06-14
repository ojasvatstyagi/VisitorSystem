// js/views/host.js

import VisitorService from "../../api/visitorApi.js";
import {
  getCurrentUser,
  showLoading,
  hideLoading,
  showAlert,
} from "../utils/helpers.js";
import { setupRegisterVisitorModal } from "./guard/registerVisitor.js";
import { renderPendingRequestsSection } from "./host/pendingRequestsSection.js";
import { renderTodaysVisitsSection } from "./host/todaysVisitsSection.js";
import { renderUpcomingVisitsSection } from "./host/upcomingVisitsSection.js";
import { renderHostVisitHistorySection } from "./host/hostVisitHistorySection.js";
export default async function loadHostView() {
  const content = document.getElementById("role-content");
  if (!content) {
    console.error("Role content area not found!");
    return;
  }

  showLoading(content);

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== "host") {
    showAlert(
      document.body,
      "Access Denied. Please login as a Host.",
      "danger"
    );
    hideLoading();
    window.location.hash = "#/login";
    return;
  }

  const hostName = currentUser.name;

  content.innerHTML = `
        <div class="app-layout">
            <main class="main-content">
                <div id="section-dashboard" class="section-content">
                    <div class="host-dashboard">

                        <div class="card shadow rounded-4 p-4 mb-4 d-flex flex-row justify-content-between align-items-center">
                            <div class="col-md-8">
                                <h2 class="mb-3"><i class="fas fa-user me-2"></i>Register Visitors</h2>
                                <p class="mb-0 text-muted">Manage you visitors, check you upcoming visits, and generate reports</p>
                            </div>
                            <div class="col-md-4 text-md-end">
                                <button id="hostRegisterVisitorBtn" class="btn btn-light rounded-pill px-4">
                                    <i class="fas fa-plus me-2"></i>Add New Visit
                                </button>
                            </div>
                        </div>

                        <div class="card shadow rounded-4 p-4 mb-4 d-flex flex-row justify-content-between">
                          <div class="col-md-8">
                            <h2 class="mb-3"><i class="fas fa-file-alt me-2"></i>Reporting</h2>
                            <p class="mb-0 text-muted">Click the button above to export visitor data.</p>
                          </div>
                          <div class="col-md-4 text-md-end">
                            <button class="btn btn-light rounded-pill px-4" id="exportHostReportBtn">
                              <i class="fas fa-download me-2"></i>Export Report
                            </button>
                          </div>
                        </div>
            
                        <div class="pending-requests card shadow-sm mb-4">
                          <div class="card-header bg-gray-custom text-dark">
                              <h2 class="requests-title mb-0">Pending Requests</h2>
                              <a href="#" data-section="requests" class="btn btn-sm btn-link-custom d-none">View All</a>
                          </div>
                          <div class="card-body" id="pending-requests-container">
                              
                          </div>
                      </div>
                        
                        <div class="upcoming-visits card shadow-sm mb-4"> <div class="card-header bg-gray-custom text-dark"> <h2 class="requests-title mb-0">Today's Visits</h2>
                            </div>
                            <div class="card-body" id="today-visits-container">
                                
                            </div>
                        </div>
                        
                        <div class="upcoming-visits card shadow-sm mb-4"> <div class="card-header bg-gray-custom text-dark"> <h2 class="requests-title mb-0">Upcoming Visits</h2>
                            </div>
                            <div class="card-body" id="upcoming-visits-container">
                                
                            </div>
                        </div>

                         <div class="card shadow-sm mb-4">
                            <div class="card-header bg-gray-custom text-dark">
                                <h2 class="requests-title mb-0">Your Visit History</h2>
                            </div>
                            <div class="card-body" id="host-visit-history-container">
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    `;

  document
    .getElementById("hostRegisterVisitorBtn")
    ?.addEventListener("click", () => {
      setupRegisterVisitorModal(
        (newVisitData) => {
          console.log("New visitor registered:", newVisitData);
          showAlert(
            document.body,
            "Visitor registered successfully!",
            "success"
          );
          loadHostDashboardData(hostName);
        },
        {
          prefillHostName: hostName,
          isHostRegistering: true,
        }
      );
    });

  document
    .getElementById("exportHostReportBtn")
    ?.addEventListener("click", async () => {
      VisitorService.exportHostVisitsToJson(hostName);
    });

  await loadHostDashboardData(hostName);

  hideLoading();
}

async function loadHostDashboardData(name) {
  try {
    const pendingContainer = document.getElementById(
      "pending-requests-container"
    );

    const response = await VisitorService.fetchVisitsByHost(name);
    const allHostVisits = response.visits || [];

    const pendingRequests = allHostVisits.filter(
      (visit) => visit.status === "Pending"
    );

    renderPendingRequestsSection(pendingRequests, name, loadHostDashboardData);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysVisits = allHostVisits.filter((visit) => {
      const visitDate = new Date(visit.visitDate);
      return visitDate.toDateString() === today.toDateString();
    });
    renderTodaysVisitsSection(todaysVisits, name, loadHostDashboardData);

    const upcomingVisits = allHostVisits.filter((visit) => {
      const visitDate = new Date(visit.visitDate);
      return (
        visitDate > today &&
        visit.status !== "Completed" &&
        visit.status !== "Cancelled" &&
        visit.status !== "Declined"
      );
    });

    renderUpcomingVisitsSection(upcomingVisits, name, loadHostDashboardData);

    const hostVisitHistory = allHostVisits.filter((visit) => {
      const visitDate = new Date(visit.visitDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      return (
        visit.status === "Completed" ||
        visit.status === "Declined" ||
        visit.status === "Cancelled" ||
        (new Date(visit.visitDate).getTime() < now.getTime() &&
          visit.status !== "Pending" &&
          visit.status !== "Approved" &&
          visit.status !== "Checked-In")
      );
    });
    renderHostVisitHistorySection(hostVisitHistory, name);
  } catch (error) {
    console.error("Error loading host dashboard data:", error);
    showAlert(
      document.body,
      "Failed to load host dashboard: " + error.message,
      "danger"
    );
    const pendingContainer = document.getElementById(
      "pending-requests-container"
    );
    if (pendingContainer) {
      pendingContainer.innerHTML = `
                <div class="text-center text-danger p-4">
                    <p>Error loading requests. Please try again.</p>
                </div>
            `;
    }
  }
}
