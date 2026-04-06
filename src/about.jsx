import "./css/App.css"

export default function About() {
    return (
      <main className="page">
        <section className="hero">
          <div className="hero-text">
            <span className="badge">About</span>
                <h1>This Project was made for CIS-6930</h1>
                <p>
                This application was developed as part of CIS 6930 to showcase the integration of software development and data-driven logic through a recipe generation system. The application allows users to input ingredients or preferences and generates relevant recipes by leveraging external APIs and structured data processing.

                The system was built using modern programming tools and focuses on handling user input, querying recipe and nutrition data, and returning organized, useful results. Key challenges included integrating reliable nutrition data APIs and ensuring accurate, consistent outputs. The project emphasizes modular design, clean data handling, and real-world application of full-stack development concepts.

                This project was developed by Johnathan Gutierrez-Diaz and Narasimha Veeramachaneni.

                <ul>https://github.com/JohnathanGD/RecipeGeneratorAI/tree/main</ul>
                </p>
          </div>
        </section>
      </main>
    );
  }