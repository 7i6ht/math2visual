# Math2Visual Frontend

A modern, interactive React application that enables teachers to generate pedagogically meaningful visualizations for math word problems (MWPs). Built with React, TypeScript, Vite, and Tailwind CSS with ShadCN UI components.


## 🛠 Tech Stack

- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 7.0.4
- **Styling**: Tailwind CSS with ShadCN UI components
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Native Fetch API
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast notifications)
- **PDF Generation**: jsPDF for export functionality
- **Code Editor**: Monaco Editor for DSL syntax editing
- **Text Processing**: pluralize and to-words for natural language utilities

## 📁 Project Structure

```
src/
├── api_services/           # Backend API integration
│   ├── analytics.ts        # Analytics and logging API
│   ├── generation.ts       # Generation API with request cancellation
│   └── svgDataset.ts       # SVG dataset management and search
├── components/
│   ├── errors/             # Error handling and display components
│   │   └── SVGMissingError.tsx
│   ├── forms/              # Form components with validation
│   │   ├── HorizontalMathProblemForm.tsx # Horizontal layout form variant
│   │   ├── MathProblemForm.tsx
│   │   └── VisualLanguageForm.tsx
│   ├── layout/             # Application layout and views
│   │   ├── AppLayout.tsx   # Main layout with state management
│   │   ├── InitialView.tsx # Single-column initial interface
│   │   └── TwoColumnView.tsx # Dual-pane editing interface
│   ├── popups/             # Interactive popup components
│   │   ├── BasePopup.tsx   # Base popup with common functionality
│   │   ├── EntityQuantityPopup.tsx # Quantity editing popup
│   │   ├── NamePopup.tsx   # Name editing popup
│   │   ├── PopupManager.tsx # Centralized popup state management
│   │   ├── SVGActionMenu.tsx # SVG selection and upload menu
│   │   ├── SVGSearchPopup.tsx # SVG search and selection
│   │   └── SVGUploadPopup.tsx # SVG upload interface
│   ├── ui/                 # ShadCN UI components and custom UI
│   │   ├── accordion.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── error-display.tsx
│   │   ├── form.tsx
│   │   ├── gear-loading.tsx # Custom loading animation
│   │   ├── highlightable-input.tsx # Input with syntax highlighting
│   │   ├── highlightable-textarea.tsx # Textarea with highlighting
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── ResponsiveLogo.tsx # Responsive logo component
│   │   ├── SessionAnalyticsDisplay.tsx # Session analytics visualization
│   │   ├── sonner.tsx      # Toast notification setup
│   │   ├── syntax-editor.tsx # Monaco Editor integration
│   │   ├── syntax-editor.css # Editor styling
│   │   └── textarea.tsx
│   └── visualization/      # Visualization display and interaction
│       ├── DownloadButton.tsx # Multi-format download (SVG/PNG/PDF)
│       ├── MissingSVGSection.tsx # Missing SVG entity handling
│       ├── ParseErrorSection.tsx # DSL parsing error display
│       ├── VisualizationResults.tsx # Results display container
│       └── VisualizationSection.tsx # Main visualization component
├── config/
│   └── api.ts              # API configuration and endpoints
├── contexts/               # React Context providers
│   ├── DSLContext.tsx      # DSL state and operations
│   └── HighlightingContext.tsx # Syntax highlighting state
├── hooks/                  # Custom React hooks
│   ├── __tests__/          # Hooks testing structure (in development)
│   ├── useAppState.ts      # Global application state
│   ├── useElementInteractions.ts # Element interaction handling
│   ├── useEntityQuantityPopup.ts # Quantity popup state
│   ├── useHighlighting.ts  # Syntax highlighting logic
│   ├── useLoadingStates.ts # Loading state management
│   ├── useMathProblemForm.ts # Math problem form logic
│   ├── useNamePopup.ts     # Name popup state
│   ├── usePopupManagement.ts # Popup coordination
│   ├── useSVGMissingError.tsx # SVG error handling
│   ├── useSVGResponsive.ts # SVG responsive behavior
│   ├── useSVGSelector.ts   # SVG selection logic
│   ├── useVisualizationHandlers.ts # Visualization event handlers
│   └── useVisualLanguageForm.ts # Visual language form logic
├── services/               # Module-level services
│   └── analyticsTracker.ts # Analytics tracking service (module-level state)
├── lib/
│   ├── dsl-utils.ts        # DSL utility functions
│   └── utils.ts            # General utility functions
├── schemas/
│   └── validation.ts       # Zod validation schemas
├── styles/
│   ├── responsive-text.css # Responsive typography system
│   └── responsive-toast.css # Responsive toast notifications for large screens
├── types/
│   ├── index.ts            # TypeScript type definitions
│   └── visualInteraction.ts # Visual interaction types
├── utils/
│   ├── download.ts         # Download functionality
│   ├── dsl-cursor-mapping.ts # DSL cursor position mapping
│   ├── dsl-formatter.ts    # DSL formatting utilities
│   ├── dsl-parser.ts       # DSL parsing logic
│   ├── elementUtils.ts     # DOM element utilities
│   ├── mwpUtils.ts         # Math word problem utilities
│   ├── numberUtils.ts      # Number formatting and conversion
│   └── validation.ts       # Validation utilities
├── App.css                 # Global application styles
├── App.tsx                 # Root application component
├── index.css               # Global CSS variables and Tailwind imports
├── main.tsx                # Application entry point
└── vite-env.d.ts           # Vite environment type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm
- Math2Visual backend running (default: http://localhost:5000)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure backend URL** (optional)
   
   The frontend automatically connects to the backend URL configured in `vite.config.ts`:
   ```typescript
   proxy: {
     '/api': {
       target: process.env.BACKEND_URL || 'http://localhost:5000',
       changeOrigin: true,
       secure: false,
     }
   }
   ```
   
   You can override the backend URL by setting the `BACKEND_URL` environment variable:
   ```bash
   BACKEND_URL=http://your-backend-url:port npm run dev
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Usage

### Basic Workflow

1. **Enter Math Word Problem**: Type or paste a math word problem into the main text area
2. **Add Formula (Optional)**: Enter the associated mathematical formula in the second input field
3. **Generate Visualization**: Click the "Generate Visualization" button
4. **Wait for Processing**: Watch the animated loading indicator while the backend processes your request
5. **Review Results**: View both formal and intuitive visualizations once generated
6. **Interactive Editing**: 
   - Edit the generated Visual Language (VL) using the Monaco Editor with syntax highlighting
   - Modify entity names and quantities using interactive popups
   - Search and upload missing SVG entities
7. **Download**: Export visualizations in your preferred format (SVG, PNG, PDF)

### Error Handling

The application handles various error scenarios:
- **Network errors**: Connection issues with the backend
- **Generation errors**: Problems during visualization creation
- **Missing SVG entities**: Upload interface for required SVG files

### Advanced Features

- **Request Cancellation**: Abort ongoing generation requests
- **Visual Language Editing**: Modify and regenerate from custom VL using Monaco Editor
- **Interactive SVG Management**: Search, upload, and manage SVGs
- **Popup-based Interactions**: Entity quantity editing and name modification
- **Multiple Download Formats**: Export in SVG, PNG, or PDF

## 🔧 Configuration

### Environment Variables

The application uses these configuration options:

- **Backend URL**: Set via `BACKEND_URL` environment variable or `vite.config.ts` (default: `http://localhost:5000`)
- **API Endpoints**: Automatically configured based on backend URL
- **Production Backend**: Set via `VITE_BACKEND_URL` environment variable for production builds

### Customization

- **Styling**: Modify `tailwind.config.js` for theme customization
- **Components**: Extend ShadCN components in `src/components/ui/`
- **API**: Update `src/config/api.ts` for backend configuration changes


## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Verify backend is running on configured port (default: 5000)
   - Check `vite.config.ts` proxy setting or `BACKEND_URL` environment variable
   - Ensure no firewall blocking the connection

2. **Build Errors**
   - Clear `node_modules` and reinstall dependencies
   - Check TypeScript errors with `npm run lint`
   - Verify all dependencies are up to date

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check CSS variable definitions in `index.css`
   - Verify ShadCN components are correctly installed

## 📝 API Integration

The frontend communicates with the Flask backend via REST API endpoints. For detailed API documentation, request/response schemas, and endpoint specifications, see the [Backend README](../backend/README.md).

### Key Integration Points

- **Generation Endpoint**: `POST /api/generate` - Creates visualizations from math word problems or visual language 
- **SVG Dataset Management**: Search and upload SVG entities for missing visualization elements
- **Error Handling**: Comprehensive error responses for validation, generation, and system failures

## 📄 License

This project is part of the Math2Visual system. See the main project repository for license information.

## 🔗 Related

- [Math2Visual GitHub Repository](https://github.com/eth-lre/math2visual)
- [Math2Visual Paper](https://arxiv.org/pdf/2506.03735)
- [Backend Documentation](../backend/README.md)