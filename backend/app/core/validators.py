import re


def validate_cpf_format(cpf: str) -> bool:
    """
    Validate Brazilian CPF format and check digits.
    
    Args:
        cpf: CPF string (can be with or without formatting)
        
    Returns:
        True if CPF is valid, False otherwise
    """
    if not cpf:
        return False
    
    # Remove formatting
    cpf = re.sub(r'[^0-9]', '', cpf)
    
    # CPF must have 11 digits
    if len(cpf) != 11:
        return False
    
    # Check if all digits are the same (invalid CPF)
    if cpf == cpf[0] * 11:
        return False
    
    # Validate check digits
    def calculate_check_digit(cpf_numbers: list, weight: int) -> int:
        total = sum(digit * weight for digit, weight in zip(cpf_numbers, range(weight, 1, -1)))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    # Convert to list of integers
    cpf_numbers = [int(digit) for digit in cpf]
    
    # Validate first check digit
    first_check = calculate_check_digit(cpf_numbers[:9], 10)
    if first_check != cpf_numbers[9]:
        return False
    
    # Validate second check digit
    second_check = calculate_check_digit(cpf_numbers[:10], 11)
    if second_check != cpf_numbers[10]:
        return False
    
    return True


def format_cpf(cpf: str) -> str:
    """
    Format CPF string to standard Brazilian format (XXX.XXX.XXX-XX).
    
    Args:
        cpf: CPF string (can be with or without formatting)
        
    Returns:
        Formatted CPF string
    """
    if not cpf:
        return ""
    
    # Remove formatting
    cpf = re.sub(r'[^0-9]', '', cpf)
    
    if len(cpf) != 11:
        return cpf
    
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
