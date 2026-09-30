-- ============================================================
-- MediConsult — MySQL schema
-- Host: 127.0.0.1:3306  |  Database: mediconsult
-- ============================================================

CREATE DATABASE IF NOT EXISTS mediconsult
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mediconsult;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(150)  NOT NULL,
    email               VARCHAR(190)  NOT NULL,
    password_hash       VARCHAR(255)  NOT NULL,
    date_of_birth       DATE          NULL,
    gender              ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    phone               VARCHAR(40)   NULL,
    blood_group         VARCHAR(8)    NULL,
    allergies           TEXT          NULL,
    chronic_conditions  TEXT          NULL,
    emergency_contact   VARCHAR(255)  NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login          DATETIME      NULL,
    is_active           TINYINT(1)    NOT NULL DEFAULT 1,
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Chat sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL,
    title               VARCHAR(200)  NOT NULL DEFAULT 'New Consultation',
    consultation_type   ENUM('primary', 'urgent', 'report_review') NOT NULL DEFAULT 'primary',
    urgency_level       ENUM('routine', 'soon', 'urgent', 'emergency') DEFAULT 'routine',
    status              ENUM('active', 'closed', 'archived') NOT NULL DEFAULT 'active',
    summary             TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_type (consultation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Chat messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id          INT UNSIGNED  NOT NULL,
    role                ENUM('user', 'assistant', 'system') NOT NULL,
    content             MEDIUMTEXT    NOT NULL,
    metadata            JSON          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_session
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    KEY idx_messages_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Medical reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_reports (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL,
    session_id          INT UNSIGNED  NULL,
    file_name           VARCHAR(255)  NOT NULL,
    original_name       VARCHAR(255)  NOT NULL,
    file_type           VARCHAR(120)  NOT NULL,
    file_size           INT UNSIGNED  NOT NULL DEFAULT 0,
    report_type         ENUM(
                            'general', 'blood_work', 'imaging', 'pathology',
                            'prescription', 'discharge', 'vitals', 'other'
                        ) DEFAULT 'general',
    extracted_text      MEDIUMTEXT    NULL,
    ai_summary          MEDIUMTEXT    NULL,
    findings            JSON          NULL,
    recommendations     JSON          NULL,
    risk_flags          JSON          NULL,
    review_status       ENUM('pending', 'reviewed', 'needs_followup') NOT NULL DEFAULT 'pending',
    uploaded_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at         DATETIME      NULL,
    CONSTRAINT fk_reports_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_session
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    KEY idx_reports_user (user_id),
    KEY idx_reports_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Triage assessments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triage_assessments (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL,
    session_id          INT UNSIGNED  NULL,
    chief_complaint     VARCHAR(500)  NOT NULL,
    symptoms            JSON          NOT NULL,
    severity_score      TINYINT UNSIGNED NULL,
    urgency_level       ENUM('routine', 'soon', 'urgent', 'emergency') NOT NULL,
    suggested_action    TEXT          NOT NULL,
    red_flags           JSON          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_triage_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_triage_session
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    KEY idx_triage_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Health notes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_notes (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL,
    note_type           ENUM('medication', 'allergy', 'condition', 'surgery', 'general')
                        NOT NULL DEFAULT 'general',
    title               VARCHAR(200)  NOT NULL,
    details             TEXT          NULL,
    is_active           TINYINT(1)    NOT NULL DEFAULT 1,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_health_notes_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_health_notes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
