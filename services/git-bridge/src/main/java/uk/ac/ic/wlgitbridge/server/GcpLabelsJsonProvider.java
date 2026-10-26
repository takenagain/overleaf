package uk.ac.ic.wlgitbridge.server;

import ch.qos.logback.classic.spi.ILoggingEvent;
import net.logstash.logback.composite.AbstractFieldJsonProvider;
import net.logstash.logback.composite.JsonWritingUtils;
import tools.jackson.core.JsonGenerator;

/** Writes projectId from MDC into logging.googleapis.com/labels so GCP Cloud Logging indexes it. */
public class GcpLabelsJsonProvider extends AbstractFieldJsonProvider<ILoggingEvent> {

  @Override
  public void writeTo(JsonGenerator generator, ILoggingEvent event) {
    String projectId = event.getMDCPropertyMap().get("projectId");
    if (projectId == null || projectId.isEmpty()) {
      return;
    }
    generator.writeObjectPropertyStart("logging.googleapis.com/labels");
    JsonWritingUtils.writeStringField(generator, "projectId", projectId);
    generator.writeEndObject();
  }
}
