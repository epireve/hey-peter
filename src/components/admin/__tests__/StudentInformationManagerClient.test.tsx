import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentInformationManagerClient } from '../StudentInformationManagerClient';

// Mock the base component
jest.mock('../StudentInformationManager', () => ({
  StudentInformationManager: ({ isLoading, onCreateStudent, onUpdateStudent, onDeleteStudent, onExportStudents, onImportStudents }: any) => (
    <div data-testid="student-information-manager">
      <div>StudentInformationManager</div>
      <div>Loading: {isLoading ? 'true' : 'false'}</div>
      <div>Handlers: {typeof onCreateStudent === 'function' ? 'functions provided' : 'no functions'}</div>
    </div>
  ),
}));

describe('StudentInformationManagerClient', () => {
  it('should render the StudentInformationManager component', () => {
    render(<StudentInformationManagerClient />);
    
    expect(screen.getByTestId('student-information-manager')).toBeInTheDocument();
    expect(screen.getByText('StudentInformationManager')).toBeInTheDocument();
  });

  it('should pass correct props to StudentInformationManager', () => {
    render(<StudentInformationManagerClient />);
    
    expect(screen.getByText('Loading: false')).toBeInTheDocument();
    expect(screen.getByText('Handlers: functions provided')).toBeInTheDocument();
  });
});