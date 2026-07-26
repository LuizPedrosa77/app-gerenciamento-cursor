import logging
import sys
from logging.handlers import RotatingFileHandler
import os

# Create logs directory if it doesn't exist
LOG_DIR = os.getenv("LOG_DIR", "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

def setup_logging():
    """Configure structured logging for the application."""
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        f"{LOG_DIR}/app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        f"{LOG_DIR}/error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
    error_handler.setFormatter(error_formatter)
    root_logger.addHandler(error_handler)
    
    return root_logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name."""
    return logging.getLogger(name)
